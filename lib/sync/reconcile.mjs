import { githubToken,githubRequester,ensureRepository,persistPullRequest,persistChecks,bumpRevision,GitHubRateLimit } from './github-runtime.mjs';
import {startObservation,finishObservation} from './observation.mjs';
import {latestDevelopmentUpdate,persistLatestActivity} from './project-activity.mjs';
import {syncSecurityStatus} from './e2eesa-status.mjs';

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
export async function reconcilePortfolio(pool,{env=process.env,fetcher=fetch,force=false,repositoryLimit=100,quick=false,concurrency=quick?5:2}={}) {
  const owner=env.ENGINE_ROOM_GITHUB_OWNER||'neophilism';
  if (!/^[a-z\d-]+$/i.test(owner)) throw new Error('Invalid GitHub owner');

  const controls=await pool.query('SELECT github_reconciliation_enabled,github_reconciliation_interval_minutes FROM engine_room_control_settings WHERE singleton=true');
  if (!force && (env.ENGINE_ROOM_PUBLIC_GITHUB_SYNC==='0' || controls.rows[0]?.github_reconciliation_enabled===false)) return {repositories:0,failed:0,disabled:true};
  const token=await githubToken(env,fetcher);
  const get=githubRequester(pool,token,env,fetcher);
  const intervalMinutes=Math.max(token?15:120,controls.rows[0]?.github_reconciliation_interval_minutes||15);
  const state=(await pool.query('SELECT * FROM engine_room_live_state WHERE singleton=true')).rows[0];
  if (state.rate_limit_reset_at && new Date(state.rate_limit_reset_at)>new Date()) return {repositories:0,failed:0,rateLimited:true,rateLimitResetAt:new Date(state.rate_limit_reset_at).toISOString()};
  let synced=0,failed=0,rateLimited=false,optionalFailures=0,metadataFailures=0,activityFailures=0,securityFailures=0;
  const failures=[];
  const run=await startObservation(pool,env);
  if(!run)return {repositories:0,failed:0,deferred:1,requested:0,status:"partial",busy:true};
  let requested=0,claimedCount=0,discoveryIncomplete=false;
  try {
    if (force || !state.discovery_at || Date.now()-new Date(state.discovery_at).getTime()>3600000) {
      let repos;
      if(token && env.GITHUB_INSTALLATION_ID && !env.GITHUB_READ_TOKEN){
        repos=[];
        for(let page=1;page<=30;page++){
          const result=await get('/installation/repositories?per_page=100&page='+page);
          if(!Array.isArray(result.repositories))throw new Error('Invalid installation repository collection');
          repos.push(...result.repositories);
          if(result.repositories.length<100)break;
          if(page===30)throw new Error('GitHub installation pagination limit exceeded');
        }
      } else {
        // /users/{owner}/repos is public only. Include private repositories
        // visible to the authorized token, but never block public discovery
        // when a fine-grained token cannot enumerate /user/repos.
        repos=await pages(get,`/users/${owner}/repos?type=owner&sort=updated`);
        if(token){
          try {
            const owned=await pages(get,'/user/repos?affiliation=owner&sort=updated');
            const merged=new Map(repos.map(r=>[r.id,r]));
            for(const r of owned)if(r.owner?.login?.toLowerCase()===owner.toLowerCase())merged.set(r.id,r);
            repos=[...merged.values()];
          } catch (discoveryError) {
            discoveryIncomplete=true;
            await pool.query("UPDATE engine_room_live_state SET discovery_scope='public-only',discovery_error='Private repository discovery unavailable' WHERE singleton=true");
            console.warn('Private repository discovery unavailable; public repositories retained.',
              discoveryError instanceof Error?discoveryError.message.slice(0,120):'unknown');
          }
        }
      }
      for (const repo of repos) await ensureRepository(pool,repo,env);
      await pool.query("UPDATE engine_room_live_state SET discovery_at=now(),discovery_scope=CASE WHEN $1 THEN 'public-and-authorized' ELSE 'public-only' END,discovery_error=CASE WHEN $2 THEN 'Private discovery incomplete' ELSE NULL END WHERE singleton=true",[!!token,discoveryIncomplete]);
    }
    const repositories=(await pool.query(`SELECT r.*,s.last_success_at FROM repositories r
      JOIN project_repositories pr ON pr.repository_id=r.id JOIN github_repository_sync s ON s.repository_id=r.id
      WHERE lower(r.owner_login)=lower($1) AND NOT r.archived AND ($2 OR s.next_attempt_at<=now())
      GROUP BY r.id,s.last_success_at,s.next_attempt_at
      ORDER BY s.last_success_at NULLS FIRST,s.next_attempt_at LIMIT $3`,[owner,force,force?null:repositoryLimit])).rows;
    requested=repositories.length;
    let cursor=0;
    async function synchronizeBatch() {
      while(cursor<repositories.length) {
        const repo=repositories[cursor++];
      const claimed=await pool.query(`UPDATE github_repository_sync SET last_attempt_at=now(),lease_until=now()+interval '5 minutes'
        WHERE repository_id=$1 AND (lease_until IS NULL OR lease_until<now()) RETURNING repository_id`,[repo.id]);
      if (!claimed.rowCount) continue;
      claimedCount++;
      const startedAt=new Date().toISOString();
      try {
        const root='/repos/'+repo.full_name;
        let metadata=repo,head=null;
        try {
          const current=await get(root);
          if(String(current.id)!==String(repo.github_repository_id))throw new Error('Repository identity changed');
          await ensureRepository(pool,current,env);
          metadata=current;
        }catch(error){optionalFailures++;metadataFailures++;console.warn('Repository About refresh unavailable for',repo.name,error?.status||'unavailable');}
        try {
          head=await get(root+'/commits/'+encodeURIComponent(metadata.default_branch||repo.default_branch));
          await pool.query('UPDATE github_repository_sync SET default_branch_sha=$2 WHERE repository_id=$1',[repo.id,head.sha]);
        }catch(error){if(![404,409].includes(error?.status)){optionalFailures++;activityFailures++;}}
        // Security records have independent permissions and failure provenance.
        try {
          const result=await syncSecurityStatus(pool,{...metadata,id:repo.id,created_at:metadata===repo?repo.github_created_at:metadata.created_at},get,head);
          if(['invalid','unavailable'].includes(result))securityFailures++;
        }catch{securityFailures++;}
        // Manual refresh reads the full PR list. Background refresh uses a safe overlap.
        const watermark=quick?undefined:repo.last_success_at?new Date(repo.last_success_at).getTime()-600000:undefined;
        const prs=await pages(get,root+'/pulls?state=all&sort=updated&direction=desc',watermark);
        const db=await pool.connect();
        try {
          await db.query('BEGIN');
          for (const pr of prs) await persistPullRequest(db,repo.id,pr);
          await bumpRevision(db);await db.query('COMMIT');
        } catch(e){await db.query('ROLLBACK');throw e;}
        finally{db.release();}
        // A quick refresh still pulls descriptions and source activity; it only skips expensive check/review queries.
        await persistLatestActivity(pool,repo.id,latestDevelopmentUpdate(metadata,prs,head));
        // Check runs, reviews and release ancestry are auxiliary signals. Their
        // permissions or transient failure must never block the authoritative PR count.
        if (token && !quick) {
          try {
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
          } catch (detailError) {
            optionalFailures++;
            console.warn('Optional GitHub metadata unavailable for',repo.name,
              detailError instanceof Error?detailError.message.slice(0,120):'unavailable');
          }
        }
        // Planned work and PR-to-unit mappings are imported independently
        // from registry/prs.json. GitHub PR synchronization MUST NOT fail
        // because a private raw Markdown/roadmap file returned HTTP 404.
        await pool.query(`UPDATE github_repository_sync SET last_success_at=$3,last_error=NULL,lease_until=NULL,
          next_attempt_at=now()+($2::integer * interval '1 minute') WHERE repository_id=$1`,[repo.id,intervalMinutes,startedAt]);
        synced++;
      } catch(error) {
        failed++;
        const until=error instanceof GitHubRateLimit?error.until:new Date(Date.now()+300000).toISOString();
        const code=Number(error?.status);
        const message=error instanceof GitHubRateLimit?'GitHub API rate limit; automatic retry scheduled':
          code===404?'GitHub PR access HTTP 404; repository may be private or inaccessible to Render credential':
          code===403?'GitHub PR access HTTP 403; credential permissions or policy insufficient':
          Number.isSafeInteger(code)&&code>=400&&code<=599?'GitHub PR request HTTP '+code+'; retry scheduled':'GitHub PR request unavailable; retry scheduled';
        failures.push({repo:repo.name,reason:message});
        await pool.query(`UPDATE github_repository_sync SET last_error=$2,lease_until=NULL,next_attempt_at=$3 WHERE repository_id=$1`,[repo.id,message,until]);
        if(error instanceof GitHubRateLimit)throw error;
      }
      }
    }
    await Promise.all(Array.from({length:Math.min(repositories.length,Math.max(1,concurrency))},synchronizeBatch));
  } catch(error) {
    if(!(error instanceof GitHubRateLimit)){await finishObservation(pool,run,{repositories:synced,failed:failed+1,requested,deferred:requested-claimedCount,discoveryIncomplete,error:'Synchronization failed; persisted evidence retained'});throw error;}
    rateLimited=true;
    await pool.query('UPDATE engine_room_live_state SET rate_limit_reset_at=$1 WHERE singleton=true',[error.until]);
  }
  await pool.query('UPDATE engine_room_live_state SET last_worker_at=now(),last_error=NULL WHERE singleton=true');
  await bumpRevision(pool);
  return finishObservation(pool,run,{requested,deferred:Math.max(0,requested-claimedCount),discoveryIncomplete,repositories:synced,failed,attempted:synced+failed,optionalFailures,metadataFailures,activityFailures,securityFailures,failures,rateLimited,
    rateLimitResetAt:rateLimited?(await pool.query('SELECT rate_limit_reset_at FROM engine_room_live_state WHERE singleton=true')).rows[0]?.rate_limit_reset_at:null});
}

