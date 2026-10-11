import planSources from '../config/portfolio-plan-sources.json' with {type:'json'};
import engineRoomMapping from '../../.exechub/approved-pr-mapping.json' with {type:'json'};
import { githubToken,githubRequester,ensureRepository,persistPullRequest,persistChecks,bumpRevision,GitHubRateLimit } from './github-runtime.mjs';
import { parsePlanItems,persistPlanDocument } from './plan-import.mjs';
import { CANONICAL_ROADMAP_PATH, candidateRoadmapPaths } from './canonical-roadmap.mjs';

async function pages(get,path,stopBefore) {
  const all=[];
  for (let page=1;page<=30;page++) {
    const rows=await get(path+(path.includes('?')?'&':'?')+'per_page=100&page='+page);
    if (!Array.isArray(rows)) throw new Error('Invalid GitHub collection');
    all.push(...rows);
    if (rows.length<100 || stopBefore && rows.some(row=>Date.parse(row.updated_at)<stopBefore)) return all;
  }
  throw new Error('GitHub pagination limit exceeded');
}

/** Incremental per-repository checkpoints. A partial failure never advances that repository's watermark. */
export async function reconcilePortfolio(pool,{env=process.env,fetcher=fetch,force=false,repositoryLimit=100}={}) {
  const owner=env.ENGINE_ROOM_GITHUB_OWNER||'neophilism';
  if (!/^[a-z\d-]+$/i.test(owner)) throw new Error('Invalid GitHub owner');

  const controls=await pool.query('SELECT github_reconciliation_enabled,github_reconciliation_interval_minutes FROM engine_room_control_settings WHERE singleton=true');
  if (env.ENGINE_ROOM_PUBLIC_GITHUB_SYNC==='0' || controls.rows[0]?.github_reconciliation_enabled===false) return {repositories:0,failed:0,disabled:true};
  const token=await githubToken(env,fetcher);
  const get=githubRequester(pool,token,env,fetcher);
  const intervalMinutes=Math.max(token?15:120,controls.rows[0]?.github_reconciliation_interval_minutes||15);
  const state=(await pool.query('SELECT * FROM engine_room_live_state WHERE singleton=true')).rows[0];
  if (state.rate_limit_reset_at && new Date(state.rate_limit_reset_at)>new Date()) return {repositories:0,failed:0,rateLimited:true,rateLimitResetAt:new Date(state.rate_limit_reset_at).toISOString()};
  let synced=0,failed=0,rateLimited=false;
  try {
    if (!state.discovery_at || Date.now()-new Date(state.discovery_at).getTime()>3600000) {
      let repos;
      if(token && env.GITHUB_INSTALLATION_ID && !env.GITHUB_READ_TOKEN){
        repos=[];
        for(let page=1;page<=30;page++){
          const result=await get('/installation/repositories?per_page=100&page='+page);
          if(!Array.isArray(result.repositories))throw new Error('Invalid installation repository collection');
          repos.push(...result.repositories);
          if(result.repositories.length<100)break;
          if(page===30)throw new Error('Installation pagination limit exceeded');
        }
      }else repos=await pages(get,`/users/${owner}/repos?type=owner&sort=updated`);
      for (const repo of repos) await ensureRepository(pool,repo,env);
      await pool.query('UPDATE engine_room_live_state SET discovery_at=now() WHERE singleton=true');
    }
    const repositories=(await pool.query(`SELECT r.*,s.last_success_at FROM repositories r
      JOIN project_repositories pr ON pr.repository_id=r.id JOIN github_repository_sync s ON s.repository_id=r.id
      WHERE lower(r.owner_login)=lower($1) AND NOT r.archived AND ($2 OR s.next_attempt_at<=now())
      AND (s.lease_until IS NULL OR s.lease_until<now()) GROUP BY r.id,s.last_success_at,s.next_attempt_at
      ORDER BY s.last_success_at NULLS FIRST,s.next_attempt_at LIMIT $3`,[owner,force,repositoryLimit])).rows;
    for (const repo of repositories) {
      const claimed=await pool.query(`UPDATE github_repository_sync SET last_attempt_at=now(),lease_until=now()+interval '5 minutes'
        WHERE repository_id=$1 AND (lease_until IS NULL OR lease_until<now()) RETURNING repository_id`,[repo.id]);
      if (!claimed.rowCount) continue;
      const startedAt=new Date().toISOString();
      try {
        const root='/repos/'+repo.full_name;
        const watermark=repo.last_success_at?new Date(repo.last_success_at).getTime()-600000:undefined;
        const prs=await pages(get,root+'/pulls?state=all&sort=updated&direction=desc',watermark);
        const db=await pool.connect();
        try {
          await db.query('BEGIN');
          for (const pr of prs) await persistPullRequest(db,repo.id,pr);
          await bumpRevision(db);await db.query('COMMIT');
        } catch(e){await db.query('ROLLBACK');throw e;}
        finally{db.release();}
        if (token) {
          const open=(await pool.query("SELECT number FROM github_pull_requests WHERE repository_id=$1 AND state='open' ORDER BY updated_at DESC",[repo.id])).rows;
          for (const pr of open) {
            const detail=await get(root+'/pulls/'+pr.number);
            await persistPullRequest(pool,repo.id,detail);
            const head=detail.head.sha;
            const checks=[];
            for(let page=1;page<=10;page++) {
              const result=await get(root+'/commits/'+head+'/check-runs?filter=latest&per_page=100&page='+page);
              checks.push(...result.check_runs);
              if(result.check_runs.length<100)break;
              if(page===10)throw new Error('Check pagination limit exceeded');
            }
            const commitStatus=await get(root+'/commits/'+head+'/status');
            const observed=new Date().toISOString();
            await persistChecks(pool,repo.id,[...checks.map(c=>({...c,id:'check_run:'+c.id,observed_at:observed})),
              ...(commitStatus.statuses||[]).map(c=>({id:'status:'+head+':'+c.context,head_sha:head,name:c.context,status:c.state==='pending'?'in_progress':'completed',
                conclusion:c.state==='success'?'success':c.state==='pending'?null:'failure',html_url:c.target_url||'',observed_at:c.updated_at||observed}))]);
            if (!checks.length && !commitStatus.statuses?.length) await pool.query(
              `UPDATE github_pull_requests SET checks_state='no-checks',checks_observed_at=now() WHERE repository_id=$1 AND number=$2 AND head_sha=$3`,[repo.id,pr.number,head]);
            const reviews=await pages(get,root+'/pulls/'+pr.number+'/reviews');
            const latest=new Map();
            for(const review of reviews)if(review.state!=='COMMENTED')latest.set(review.user?.login,review.state);
            const states=[...latest.values()];
            await pool.query(`UPDATE github_pull_requests SET review_summary=$3 WHERE repository_id=$1 AND number=$2`,[repo.id,pr.number,
              states.filter(x=>x==='APPROVED').length+' approvals · '+states.filter(x=>x==='CHANGES_REQUESTED').length+' changes requested · '+(detail.requested_reviewers?.length||0)+' reviewers requested']);
          }
          try{
            const commits=await get(root+'/commits/'+encodeURIComponent(repo.default_branch));
            await pool.query('UPDATE github_repository_sync SET default_branch_sha=$2 WHERE repository_id=$1',[repo.id,commits.sha]);
            const staged=(await pool.query(`SELECT number,merge_commit_sha FROM github_pull_requests WHERE repository_id=$1 AND merged_at IS NOT NULL
              AND base_ref IS DISTINCT FROM $2 AND merge_commit_sha IS NOT NULL AND release_target_sha IS DISTINCT FROM $3`,[repo.id,repo.default_branch,commits.sha])).rows;
            for(const pr of staged){
              let comparison;
              try{comparison=await get(root+'/compare/'+encodeURIComponent(commits.sha)+'...'+encodeURIComponent(pr.merge_commit_sha));}
              catch(error){if(error.status!==404)throw error;await pool.query(`UPDATE github_pull_requests SET release_included=NULL,release_target_sha=$3,release_checked_at=now() WHERE repository_id=$1 AND number=$2`,[repo.id,pr.number,commits.sha]);continue;}
              if(!['behind','identical','ahead','diverged'].includes(comparison.status))throw new Error('Invalid commit ancestry response');
              await pool.query(`UPDATE github_pull_requests SET release_included=$3,release_target_sha=$4,release_checked_at=now()
                WHERE repository_id=$1 AND number=$2 AND merge_commit_sha=$5`,[repo.id,pr.number,['behind','identical'].includes(comparison.status),commits.sha,pr.merge_commit_sha]);
            }
          }catch(error){if(![404,409].includes(error.status))throw error;}
        }
        const knownPrs=(await pool.query('SELECT number,title FROM github_pull_requests WHERE repository_id=$1',[repo.id])).rows;
        const candidates=candidateRoadmapPaths(repo.name,planSources);
        for (const path of candidates) {
          const response=await fetcher('https://raw.githubusercontent.com/'+repo.full_name+'/'+encodeURIComponent(repo.default_branch)+'/'+path,
            {headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(12000)});
          if(response.status===404)continue;
          if(!response.ok)throw new Error('Plan source unavailable');
          const body=await response.text();
          if(Buffer.byteLength(body)>500000)throw new Error('Plan source too large');
          let approvedMapping=null;
          if (path==='.exechub/project.yml') {
            const evidence=await fetcher('https://raw.githubusercontent.com/'+repo.full_name+'/'+encodeURIComponent(repo.default_branch)+'/.exechub/approved-pr-mapping.json',
              {headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(12000)});
            if (evidence.ok) {
              approvedMapping=await evidence.text();
              if (Buffer.byteLength(approvedMapping)>64000) throw new Error('Approved PR mapping too large.');
            } else if (evidence.status!==404) throw new Error('Approved mapping source temporarily unavailable.');
          }
          const items=parsePlanItems(body,path,repo.name,knownPrs,approvedMapping);
          if(!items.length)continue;
          if(repo.full_name===engineRoomMapping.sourceRepository && path==='docs/development-plan.md')for(const item of items){
            const number=engineRoomMapping.pullRequestNumbers[item.ordinal-1];
            if(number){item.numbers=[number];item.reason='Explicit approved original-roadmap mapping';}
          }
          const ref=(await pool.query('SELECT default_branch_sha FROM github_repository_sync WHERE repository_id=$1',[repo.id])).rows[0]?.default_branch_sha||repo.default_branch;
          // Import the earliest source revision first so first observation is not mistaken for the original plan.
          const previous=await pool.query('SELECT 1 FROM project_plan_documents WHERE repository_id=$1 AND path=$2 LIMIT 1',[repo.id,path]);
          if(token&&!previous.rowCount&&!path.endsWith('.json')&&path!=='.exechub/project.yml'){
            const history=await pages(get,root+'/commits?path='+encodeURIComponent(path));
            const earliest=history.at(-1)?.sha;
            if(earliest&&earliest!==ref){
              const originalResponse=await fetcher('https://raw.githubusercontent.com/'+repo.full_name+'/'+earliest+'/'+path,
                {headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});
              if(!originalResponse.ok)throw new Error('Original plan source unavailable');
              const originalBody=await originalResponse.text();
              if(Buffer.byteLength(originalBody)>500000)throw new Error('Original plan source too large');
              const originalItems=parsePlanItems(originalBody,path,repo.name,knownPrs,approvedMapping);
              if(repo.full_name===engineRoomMapping.sourceRepository)for(const item of originalItems){
                const number=engineRoomMapping.pullRequestNumbers[item.ordinal-1];
                if(number){item.numbers=[number];item.reason='Explicit approved original-roadmap mapping';}
              }
              if(originalItems.length)await persistPlanDocument(pool,repo,{path,body:originalBody,ref:earliest,items:originalItems});
            }
          }
          const db=await pool.connect();
          try {await db.query('BEGIN');await persistPlanDocument(db,repo,{path,body,ref,items});await db.query('COMMIT');}
          catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
          if(path===CANONICAL_ROADMAP_PATH || !planSources[repo.name])break; // One canonical source per repository; preserve explicit legacy additions when absent.
        }
        await pool.query(`UPDATE github_repository_sync SET last_success_at=$3,last_error=NULL,lease_until=NULL,
          next_attempt_at=now()+($2::integer * interval '1 minute') WHERE repository_id=$1`,[repo.id,intervalMinutes,startedAt]);
        synced++;
      } catch(error) {
        failed++;
        const until=error instanceof GitHubRateLimit?error.until:new Date(Date.now()+300000).toISOString();
        await pool.query(`UPDATE github_repository_sync SET last_error=$2,lease_until=NULL,next_attempt_at=$3 WHERE repository_id=$1`,[repo.id,
          error instanceof GitHubRateLimit?'GitHub rate limit; automatic retry scheduled':'Source request failed; previous records preserved',until]);
        if(error instanceof GitHubRateLimit)throw error;
      }
    }
  } catch(error) {
    if(!(error instanceof GitHubRateLimit))throw error;
    rateLimited=true;
    await pool.query('UPDATE engine_room_live_state SET rate_limit_reset_at=$1 WHERE singleton=true',[error.until]);
  }
  await pool.query('UPDATE engine_room_live_state SET last_worker_at=now(),last_error=NULL WHERE singleton=true');
  await bumpRevision(pool);
  return {repositories:synced,failed,rateLimited,rateLimitResetAt:rateLimited?(await pool.query('SELECT rate_limit_reset_at FROM engine_room_live_state WHERE singleton=true')).rows[0]?.rate_limit_reset_at:null};
}
