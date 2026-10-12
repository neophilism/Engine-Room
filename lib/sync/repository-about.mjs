import {readFile} from 'node:fs/promises';
import {githubToken,ensureRepository} from './github-runtime.mjs';

/** One owner-authorized seed, never a recurring replacement for GitHub About. */
export async function seedRepositoryAbout(db,{env=process.env,fetcher=fetch,seed}={}) {
  seed ||= JSON.parse(await readFile(new URL('../config/repository-about-seed.json',import.meta.url),'utf8'));
  const token=await githubToken(env,fetcher);
  if(!token)return {updated:0,preserved:0,failed:0,disabled:true};
  const report={updated:0,preserved:0,failed:0};
  const base=env.GITHUB_API_BASE_URL||'https://api.github.com';
  const headers={Accept:'application/vnd.github+json','User-Agent':'Engine-Room',Authorization:'Bearer '+token};
  for(const entry of seed.entries) {
    if(!/^neophilism\/[A-Za-z0-9_.-]+$/.test(entry.repository)||!entry.description?.trim()||entry.description.length>350)throw new Error('Invalid About seed');
    const saved=(await db.query('SELECT state FROM repository_about_seed WHERE repository_full_name=$1',[entry.repository])).rows[0];
    if(saved&&['applied','preserved','excluded'].includes(saved.state))continue;
    await db.query(`INSERT INTO repository_about_seed(repository_full_name,requested_description,state,last_attempt_at)
      VALUES($1,$2,'pending',now()) ON CONFLICT(repository_full_name) DO UPDATE SET last_attempt_at=now()`,[entry.repository,entry.description]);
    let status=0;
    try {
      const response=await fetcher(base+'/repos/'+entry.repository,{headers,signal:AbortSignal.timeout(15000)});
      status=response.status;
      if(!response.ok)throw new Error('Repository metadata access failed');
      const repo=await response.json();
      if(repo.full_name!==entry.repository||repo.fork||repo.archived||
        !(repo.created_at>=seed.scopeYear+'-01-01'||seed.olderExceptions.includes(entry.repository))) {
        await db.query("UPDATE repository_about_seed SET state='excluded' WHERE repository_full_name=$1",[entry.repository]);continue;
      }
      if(repo.description?.trim()) {
        await ensureRepository(db,repo,env);
        await db.query("UPDATE repository_about_seed SET state='preserved',applied_at=now(),error_code=NULL WHERE repository_full_name=$1",[entry.repository]);
        report.preserved++;continue;
      }
      const written=await fetcher(base+'/repos/'+entry.repository,{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},
        body:JSON.stringify({description:entry.description}),signal:AbortSignal.timeout(15000)});
      status=written.status;
      if(!written.ok)throw new Error('Repository About write failed');
      const verified=await fetcher(base+'/repos/'+entry.repository,{headers:{...headers,'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
      status=verified.status;
      if(!verified.ok)throw new Error('Repository About readback failed');
      const result=await verified.json();
      if(result.description!==entry.description)throw new Error('Repository About did not match readback');
      await ensureRepository(db,result,env);
      await db.query("UPDATE repository_about_seed SET state='applied',applied_at=now(),error_code=NULL WHERE repository_full_name=$1",[entry.repository]);
      report.updated++;
    }catch {
      report.failed++;
      await db.query("UPDATE repository_about_seed SET state='failed',error_code=$2 WHERE repository_full_name=$1",[entry.repository,status||null]);
      // Read access does not imply administration access. Never change token permissions.
      if([401,403,429].includes(status))break;
    }
  }
  return report;
}
