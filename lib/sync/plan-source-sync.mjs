import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { githubToken,persistPullRequest } from './github-runtime.mjs';
import { persistPlanDocument } from './plan-import.mjs';
import { STRUCTURED_PR_PATH, PR_SNAPSHOT_DIRECTORY, parseStructuredPrRegistry, snapshotPrToGitHub, attachObservedWorkIds } from './structured-pr-registry.mjs';
import { CANONICAL_ROADMAP_PATH, parseCanonicalRoadmap } from './canonical-roadmap.mjs';

/**
 * Machine-readable PR reconciliation independent of the GitHub REST quota.
 *
 * Each project has a single JSON unit/PR registry. The preferred source is
 * registry/prs.json in the owning repository. If private GitHub file access
 * fails, a separately versioned, GitHub-observed snapshot bundled with the
 * Engine Room deployment is used. This fallback MUST NOT mark GitHub live
 * synchronization successful or claim its observation time is the present.
 * Historical Markdown plans and registry/roadmap.json are retained as docs.
 */
export async function reconcilePlanSources(pool, {
  fetcher=fetch, owner='neophilism', repositoryLimit=100, concurrency=4,
  readSnapshot=async(name) => readFile(
    join(process.cwd(),PR_SNAPSHOT_DIRECTORY,name+'.json'),'utf8')
}={}) {
  if(!/^[a-z\d-]+$/i.test(owner))throw new Error('Invalid repository owner');
  const result=await pool.query(
    'SELECT DISTINCT r.id,r.name,r.full_name,r.default_branch '+
    'FROM repositories r JOIN project_repositories pr ON pr.repository_id=r.id '+
    'WHERE lower(r.owner_login)=lower($1) AND NOT r.archived ORDER BY r.name LIMIT $2',
    [owner,repositoryLimit]
  );
  const completed=[],errors=[];
  let token;
  try {token=await githubToken(process.env,fetcher);}catch {token=undefined;}
  let cursor=0;

  async function fetchGitHubPlanFile(repo,path) {
    const url='https://github.com/'+repo.full_name+'/blob/'+encodeURIComponent(repo.default_branch)+'/'+path;
    const raw='https://raw.githubusercontent.com/'+repo.full_name+'/'+encodeURIComponent(repo.default_branch)+'/'+path;
    let status=null;
    try {
      const response=await fetcher(raw,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5500)});
      status=response.status;
      if(response.ok) return {body:await response.text(),origin:'repository',url,path};
    } catch { /* Try the GitHub Contents API as well as the raw CDN. */ }
    try {
      const rest=await fetcher('https://api.github.com/repos/'+repo.full_name+'/contents/'+path+
        '?ref='+encodeURIComponent(repo.default_branch),
        {headers:{Accept:'application/vnd.github+json','User-Agent':'Engine-Room',
          ...(token?{Authorization:'Bearer '+token}:{})},signal:AbortSignal.timeout(6500)});
      status=rest.status;
      if(rest.ok) {
        const json=await rest.json();
        if(json.encoding!=='base64'||typeof json.content!=='string')
          throw new Error('Unexpected GitHub Contents encoding');
        return {body:Buffer.from(json.content.replace(/\\s/g,''),'base64').toString('utf8'),
          origin:'repository',url,path};
      }
    } catch { /* A bundled historical snapshot can bootstrap an entirely new source. */ }
    return {status};
  }

  async function fetchRegistry(repo) {
    if (!/^[a-z0-9._-]+\\/[a-z0-9._-]+$/i.test(repo.full_name) ||
        !/^[a-z0-9._-]+$/i.test(repo.default_branch) ||
        !/^[a-z0-9._-]+$/i.test(repo.name))
      throw new Error('Invalid source repository coordinates');
    // Structured work-unit mappings take precedence. An existing canonical
    // roadmap is also a complete machine-readable plan: do not make its owner
    // create a redundant prs.json or copy snapshots into Engine Room.
    const structured=await fetchGitHubPlanFile(repo,STRUCTURED_PR_PATH);
    if(structured.origin==='repository')return structured;
    const canonical=await fetchGitHubPlanFile(repo,CANONICAL_ROADMAP_PATH);
    if(canonical.origin==='repository')return canonical;
    try {
      const body=await readSnapshot(repo.name);
      return {body,origin:'bundled',path:STRUCTURED_PR_PATH,
        url:'https://github.com/neophilism/Engine-Room/blob/main/'+PR_SNAPSHOT_DIRECTORY+'/'+repo.name+'.json'};
    } catch {
      throw new Error('Neither PR registry nor canonical roadmap accessible (GitHub HTTP '+
        (canonical.status??structured.status??'network')+'; no bundled snapshot)');
    }
  }

  async function processRepo(repo) {
    const {body,origin,url,path}=await fetchRegistry(repo);
    // Never replace a previously imported roadmap with an older bundled
    // snapshot during an authentication outage. The database already retains
    // that source version; a failed live fetch must not change its provenance.
    if (origin === 'bundled') {
      const prior = await pool.query(
        'SELECT 1 FROM project_plan_documents WHERE repository_id=$1 AND path=ANY($2::text[]) LIMIT 1',
        [repo.id,[STRUCTURED_PR_PATH,CANONICAL_ROADMAP_PATH]]
      );
      if (prior.rows.length) throw new Error(
        'GitHub PR registry unavailable; previous plan retained rather than overwritten with a historical snapshot.'
      );
    }
    const {document,items,pullRequests}=path===CANONICAL_ROADMAP_PATH ?
      {document:{observedAt:new Date().toISOString()},items:parseCanonicalRoadmap(body,repo.name),pullRequests:[]} :
      parseStructuredPrRegistry(body,repo.name);
    const db=await pool.connect();
    let refreshed=0;
    try {
      await db.query('BEGIN');
      const current=(await db.query('SELECT number,updated_at FROM github_pull_requests WHERE repository_id=$1',[repo.id])).rows;
      const times=new Map(current.map(x=>[Number(x.number),new Date(x.updated_at).getTime()]));
      for(const record of pullRequests) {
        // A bundled snapshot must NEVER overwrite a newer webhook or API
        // observation, nor pretend an unchanged observation was just fetched.
        if((times.get(record.number)??-Infinity)>=Date.parse(record.updatedAt))continue;
        await persistPullRequest(db,repo.id,snapshotPrToGitHub(record));
        refreshed++;
      }
      // Live PR rows take precedence over stale snapshot observations. Extend only
      // unlinked work units with unique, exact stable IDs in real PR titles.
      const observed=(await db.query('SELECT number,title FROM github_pull_requests WHERE repository_id=$1',[repo.id])).rows;
      const mapped=attachObservedWorkIds(items,observed);
      await persistPlanDocument(db,repo,{
        path,body,ref:origin==='repository'?repo.default_branch:'bundled:'+document.observedAt,
        sourceUrl:url,items:mapped
      });
      await db.query('COMMIT');
      completed.push({repo:repo.name,origin,units:mapped.length,autoLinked:mapped.filter((unit,index)=>
        !items[index].numbers.length && unit.numbers.length).length,prObservations:refreshed,observedAt:document.observedAt});
    }catch(error){await db.query('ROLLBACK');throw error;}
    finally{db.release();}

  }

  async function worker(){
    while(cursor<result.rows.length){
      const repo=result.rows[cursor++];
      try{await processRepo(repo);}
      catch(error){errors.push({repo:repo.name,error:error instanceof Error?error.message.slice(0,240):'Unknown PR registry error'});}
    }
  }
  await Promise.all(Array.from({length:Math.min(result.rows.length,Math.max(1,concurrency))},worker));
  return {registered:result.rows.length,withDocumentedSource:result.rows.length,
    imported:completed.length,failed:errors.length,fromRepository:completed.filter(x=>x.origin==='repository').length,
    fromSnapshot:completed.filter(x=>x.origin==='bundled').length,prObservations:completed.reduce((a,x)=>a+x.prObservations,0),
    completed,errors};
}
