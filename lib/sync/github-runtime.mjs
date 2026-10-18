import { createSign } from 'node:crypto';
import {githubTimestamp,latestDevelopmentUpdate,persistLatestActivity} from './project-activity.mjs';

export function summarizeChecks(checks) {
  if (!checks.length) return 'no-checks';
  if (checks.some(c => ['failure','timed_out','cancelled','action_required','startup_failure','error'].includes(c.conclusion))) return 'failing';
  if (checks.some(c => c.status === 'in_progress')) return 'running';
  if (checks.some(c => c.status !== 'completed')) return 'queued';
  return 'passing';
}

export async function bumpRevision(db) {
  await db.query('UPDATE engine_room_live_state SET revision=revision+1,changed_at=now() WHERE singleton=true');
}

export async function persistPullRequest(db, repositoryId, pr) {
  if (!Number.isSafeInteger(pr.id) || !Number.isSafeInteger(pr.number) || !['open','closed'].includes(pr.state)) throw new Error('Invalid pull request');
  const result = await db.query(`INSERT INTO github_pull_requests
    (github_pull_request_id,repository_id,number,title,state,draft,html_url,author_login,created_at,updated_at,closed_at,merged_at,last_synced_at,head_sha,base_ref,mergeable,merge_commit_sha)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),$13,$14,$15,$16)
    ON CONFLICT(github_pull_request_id) DO UPDATE SET title=excluded.title,state=excluded.state,draft=excluded.draft,
      html_url=excluded.html_url,author_login=excluded.author_login,updated_at=excluded.updated_at,
      closed_at=excluded.closed_at,merged_at=excluded.merged_at,last_synced_at=now(),head_sha=excluded.head_sha,
      base_ref=excluded.base_ref,mergeable=excluded.mergeable,
      merge_commit_sha=excluded.merge_commit_sha,
      release_included=CASE WHEN github_pull_requests.merge_commit_sha IS DISTINCT FROM excluded.merge_commit_sha THEN NULL ELSE github_pull_requests.release_included END,
      release_target_sha=CASE WHEN github_pull_requests.merge_commit_sha IS DISTINCT FROM excluded.merge_commit_sha THEN NULL ELSE github_pull_requests.release_target_sha END,
      checks_state=CASE WHEN github_pull_requests.head_sha IS DISTINCT FROM excluded.head_sha THEN 'unknown' ELSE github_pull_requests.checks_state END,
      checks_observed_at=CASE WHEN github_pull_requests.head_sha IS DISTINCT FROM excluded.head_sha THEN NULL ELSE github_pull_requests.checks_observed_at END
    WHERE excluded.updated_at >= github_pull_requests.updated_at
    RETURNING id`,
    [pr.id,repositoryId,pr.number,pr.title,pr.state,!!pr.draft,pr.html_url,pr.user?.login||null,pr.created_at,pr.updated_at,
      pr.closed_at||null,pr.merged_at||null,pr.head?.sha||null,pr.base?.ref||null,typeof pr.mergeable==='boolean'?pr.mergeable:null,pr.merge_commit_sha||null]);
  return result.rowCount>0;
}

export async function persistChecks(db, repositoryId, checks) {
  for (const c of checks) {
    await db.query(`INSERT INTO github_check_runs(repository_id,external_id,head_sha,name,status,conclusion,html_url,observed_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(repository_id,external_id) DO UPDATE SET
      head_sha=excluded.head_sha,name=excluded.name,status=excluded.status,conclusion=excluded.conclusion,html_url=excluded.html_url,observed_at=excluded.observed_at
      WHERE excluded.observed_at>=github_check_runs.observed_at`,
      [repositoryId,String(c.id),c.head_sha,c.name,c.status,c.conclusion||null,c.html_url||'',c.observed_at]);
  }
  const heads = [...new Set(checks.map(c=>c.head_sha))];
  for (const head of heads) {
    const result=await db.query('SELECT DISTINCT ON(name) status,conclusion,html_url,observed_at FROM github_check_runs WHERE repository_id=$1 AND head_sha=$2 ORDER BY name,observed_at DESC,external_id DESC',[repositoryId,head]);
    const link=result.rows.find(c=>['failure','timed_out','cancelled','action_required','startup_failure','error'].includes(c.conclusion))||result.rows[0];
    const observed=new Date(Math.max(...result.rows.map(c=>new Date(c.observed_at).getTime()))).toISOString();
    await db.query(`UPDATE github_pull_requests SET checks_state=$3,checks_observed_at=$5,checks_url=$4
      WHERE repository_id=$1 AND head_sha=$2`,[repositoryId,head,summarizeChecks(result.rows),link?.html_url||null,observed]);
  }
}

export async function ensureRepository(db, repo, env=process.env) {
  const owner=env.ENGINE_ROOM_GITHUB_OWNER||'neophilism';
  const excluded=new Set((env.ENGINE_ROOM_EXCLUDE_REPOSITORIES||'datasciencecoursera,opencv,pupil,facerec').toLowerCase().split(',').map(x=>x.trim()));
  if (!repo || repo.owner?.login?.toLowerCase()!==owner.toLowerCase() || repo.fork || excluded.has(repo.name?.toLowerCase())) return null;
  if (repo.private && !env.GITHUB_INSTALLATION_ID && !env.GITHUB_READ_TOKEN) return null;
  const hasAbout=Object.hasOwn(repo,'description');
  const r=await db.query(`INSERT INTO repositories(id,github_repository_id,owner_login,name,full_name,html_url,default_branch,visibility,archived,
    github_description,github_homepage,github_topics,github_created_at,github_updated_at,github_pushed_at,metadata_synced_at)
    VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,CASE WHEN $15 THEN now() END)
    ON CONFLICT(github_repository_id) DO UPDATE SET
    owner_login=excluded.owner_login,html_url=excluded.html_url,full_name=excluded.full_name,name=excluded.name,default_branch=excluded.default_branch,visibility=excluded.visibility,archived=excluded.archived,
    github_description=CASE WHEN $15 THEN excluded.github_description ELSE repositories.github_description END,
    github_homepage=CASE WHEN $15 THEN excluded.github_homepage ELSE repositories.github_homepage END,
    github_topics=CASE WHEN $15 THEN excluded.github_topics ELSE repositories.github_topics END,
    github_created_at=coalesce(excluded.github_created_at,repositories.github_created_at),
    github_updated_at=coalesce(excluded.github_updated_at,repositories.github_updated_at),
    github_pushed_at=coalesce(excluded.github_pushed_at,repositories.github_pushed_at),
    metadata_synced_at=CASE WHEN $15 THEN now() ELSE repositories.metadata_synced_at END,updated_at=now() RETURNING id`,
    [repo.id,repo.owner.login,repo.name,repo.full_name,repo.html_url,repo.default_branch||'main',repo.private?'private':'public',!!repo.archived,
      repo.description?.trim()||null,repo.homepage||null,JSON.stringify(repo.topics||[]),githubTimestamp(repo.created_at),githubTimestamp(repo.updated_at),githubTimestamp(repo.pushed_at),hasAbout]);
  const id=r.rows[0].id;
  const existing=await db.query('SELECT project_id FROM project_repositories WHERE repository_id=$1 LIMIT 1',[id]);
  if (!existing.rows.length && !repo.archived) {
    const slug=repo.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    // Preserve existing project ownership. Two repository names can normalize
    // to the same slug; never silently attach one repository to another project.
    let linked=false;
    for(const candidate of [slug,slug+'-'+repo.id]) {
      const project=await db.query(`INSERT INTO projects(id,slug,display_name,summary,status) VALUES(gen_random_uuid(),$1,$2,$3,'planned')
        ON CONFLICT(slug) DO UPDATE SET summary=projects.summary RETURNING id`,[candidate,repo.name.replace(/[-_]/g,' '),repo.description||null]);
      const attachment=await db.query(`INSERT INTO project_repositories(project_id,repository_id,relationship)
        SELECT $1,$2,'primary' WHERE NOT EXISTS(SELECT 1 FROM project_repositories WHERE project_id=$1 AND relationship='primary' AND repository_id<>$2)
        ON CONFLICT DO NOTHING RETURNING project_id`,[project.rows[0].id,id]);
      if(attachment.rowCount){linked=true;break;}
      const same=await db.query('SELECT project_id FROM project_repositories WHERE repository_id=$1 LIMIT 1',[id]);
      if(same.rows.length){linked=true;break;}
    }
    if(!linked)throw new Error('Repository project identity collision; existing links preserved');
  }
  if(hasAbout)await db.query(`UPDATE projects p SET summary=$2,updated_at=now() FROM project_repositories pr
    WHERE pr.project_id=p.id AND pr.repository_id=$1 AND pr.relationship='primary' AND p.summary IS DISTINCT FROM $2`,[id,repo.description?.trim()||null]);
  await db.query('INSERT INTO github_repository_sync(repository_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
  return id;
}

export class GitHubRateLimit extends Error {
  constructor(until) { super('GitHub API rate limited'); this.until=until; }
}

let cachedInstallationToken;
export async function githubToken(env=process.env, fetcher=fetch) {
  if (env.GITHUB_READ_TOKEN?.trim()) return env.GITHUB_READ_TOKEN.trim();
  if (!env.GITHUB_APP_ID||!env.GITHUB_APP_PRIVATE_KEY||!env.GITHUB_INSTALLATION_ID) return undefined;
  if(cachedInstallationToken?.installation===env.GITHUB_INSTALLATION_ID && cachedInstallationToken.expires>Date.now()+300000)return cachedInstallationToken.token;
  const now=Math.floor(Date.now()/1000);
  const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const content=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iat:now-60,exp:now+540,iss:env.GITHUB_APP_ID});
  const signer=createSign('RSA-SHA256');signer.update(content);
  const jwt=content+'.'+signer.sign(env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g,'\n'),'base64url');
  const response=await fetcher(`${env.GITHUB_API_BASE_URL||'https://api.github.com'}/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`,
    {method:'POST',headers:{Authorization:'Bearer '+jwt,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('GitHub installation authentication failed');
  const result=await response.json();
  if (typeof result.token!=='string') throw new Error('Invalid installation token');
  cachedInstallationToken={installation:env.GITHUB_INSTALLATION_ID,token:result.token,expires:Date.parse(result.expires_at)||Date.now()+3000000};
  return result.token;
}

export function githubRequester(db, token, env=process.env, fetcher=fetch) {
  return async path=>{
    // Keep large cached GitHub payloads on the server: read the ETag first and
    // fetch the JSON body only when GitHub confirms that it is unchanged.
    const saved=await db.query('SELECT etag FROM github_sync_http_cache WHERE path=$1',[path]);
    const response=await fetcher((env.GITHUB_API_BASE_URL||'https://api.github.com')+path,{
      headers:{Accept:'application/vnd.github+json','User-Agent':'Engine-Room',...(token?{Authorization:'Bearer '+token}:{}),
        ...(saved.rows[0]?.etag?{'If-None-Match':saved.rows[0].etag}:{})},signal:AbortSignal.timeout(20000)});
    if (response.status===304 && saved.rows.length) {
      const cached=await db.query('SELECT payload FROM github_sync_http_cache WHERE path=$1',[path]);
      if (cached.rows.length) return cached.rows[0].payload;
      throw new Error('GitHub response returned 304 without a cached payload');
    }
    if (response.status===429 || response.status===403 && (response.headers.get('x-ratelimit-remaining')==='0'||response.headers.has('retry-after'))) {
      const retry=Number(response.headers.get('retry-after'));
      const reset=Number(response.headers.get('x-ratelimit-reset'))*1000;
      throw new GitHubRateLimit(new Date(Math.max(Date.now()+60000,reset||Date.now()+(retry||300)*1000)).toISOString());
    }
    if (!response.ok) throw Object.assign(new Error('GitHub request failed: HTTP '+response.status),{status:response.status});
    const value=await response.json();
    await db.query(`INSERT INTO github_sync_http_cache(path,etag,payload) VALUES($1,$2,$3::jsonb)
      ON CONFLICT(path) DO UPDATE SET etag=excluded.etag,payload=excluded.payload,checked_at=now()`,[path,response.headers.get('etag'),JSON.stringify(value)]);
    return value;
  };
}

export async function applyWebhook(db, event, payload, receivedAt=new Date(), env=process.env) {
  if (!payload||typeof payload!=='object') throw new Error('Invalid webhook payload');
  if (event==='ping') return;
  const id=await ensureRepository(db,payload.repository,env);
  if (!id) return; // Signed events outside the authorized owner's portfolio never register projects.
  if (event==='pull_request') {
    await persistPullRequest(db,id,payload.pull_request);
    await persistLatestActivity(db,id,latestDevelopmentUpdate(payload.repository,[payload.pull_request]));
  }
  if (event==='check_run' || event==='workflow_run') {
    const c=payload[event];
    if (!c?.head_sha || !c.id) throw new Error('Invalid check event');
    const observed=c.completed_at||c.updated_at||c.started_at||c.created_at||receivedAt;
    await persistChecks(db,id,[{...c,id:event+':'+c.id,name:c.name||'Workflow',observed_at:observed}]);
    await db.query(`INSERT INTO github_development_activity(repository_id,kind,external_id,title,html_url,occurred_at,state,conclusion)
      VALUES($1,'workflow',$2,$3,$4,$5,$6,$7) ON CONFLICT(repository_id,kind,external_id) DO UPDATE SET
      state=excluded.state,conclusion=excluded.conclusion,occurred_at=excluded.occurred_at,last_synced_at=now()
      WHERE excluded.occurred_at>=github_development_activity.occurred_at`,[id,event+':'+c.id,c.name||'Workflow',c.html_url||'',observed,c.status,c.conclusion||null]);
  }
  if (event==='status') await persistChecks(db,id,[{id:'status:'+payload.sha+':'+payload.context,head_sha:payload.sha,name:payload.context,
    status:payload.state==='pending'?'in_progress':'completed',conclusion:payload.state==='success'?'success':payload.state==='pending'?null:'failure',
    html_url:payload.target_url||'',observed_at:payload.updated_at||payload.created_at||receivedAt}]);
  if (event==='issues' || event==='pull_request_review') {
    const item=event==='issues'?payload.issue:payload.review;
    await db.query(`INSERT INTO github_development_activity(repository_id,kind,external_id,title,html_url,occurred_at,actor_login,state)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(repository_id,kind,external_id) DO UPDATE SET
      title=excluded.title,state=excluded.state,occurred_at=excluded.occurred_at,last_synced_at=now()
      WHERE excluded.occurred_at>=github_development_activity.occurred_at`,[id,event==='issues'?'issue':'review',String(item.id),item.title||'PR review',item.html_url,
        item.updated_at||item.submitted_at||receivedAt,item.user?.login||null,item.state||payload.action]);
  }
  if (event==='push') {
    const pr=(await db.query("SELECT number,title,html_url FROM github_pull_requests WHERE repository_id=$1 AND state='open' AND head_sha=$2 ORDER BY updated_at DESC LIMIT 1",[id,payload.after])).rows[0];
    const pushedAt=githubTimestamp(payload.repository.pushed_at);
    if(pushedAt)await persistLatestActivity(db,id,{kind:pr?'pr-pushed':payload.ref==='refs/heads/'+(payload.repository.default_branch||'main')?'direct-commit':'repository-push',
      at:pushedAt,title:pr?`PR #${pr.number} pushed: ${pr.title}`:payload.head_commit?.message?.split('\n')[0]||'Repository push',
      url:pr?.html_url||payload.compare||payload.repository.html_url,ref:payload.after});
    if (payload.ref==='refs/heads/'+(payload.repository.default_branch||'main')) await db.query(
      'UPDATE github_repository_sync SET default_branch_sha=$2 WHERE repository_id=$1',[id,payload.after]);
    for (const c of (payload.commits||[]).slice(-50)) await db.query(`INSERT INTO github_development_activity(repository_id,kind,external_id,title,html_url,occurred_at,actor_login)
      VALUES($1,'commit',$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,[id,c.id,c.message.split('\n')[0],c.url,c.timestamp,c.author?.username||null]);
  }
  await db.query('UPDATE github_repository_sync SET next_attempt_at=now() WHERE repository_id=$1',[id]);
  await bumpRevision(db);
}

/** Row locks live for the whole apply+ack transaction. A crash leaves the delivery available for retry. */
export async function processWebhookInbox(pool, {batch=20,env=process.env}={}) {
  let processed=0,failed=0;
  for (let i=0;i<batch;i++) {
    const db=await pool.connect();
    try {
      await db.query('BEGIN');
      const r=await db.query(`SELECT * FROM github_webhook_deliveries WHERE processed_at IS NULL AND next_attempt_at<=now()
        ORDER BY received_at,id FOR UPDATE SKIP LOCKED LIMIT 1`);
      const row=r.rows[0];
      if (!row) {await db.query('COMMIT');break;}
      await db.query('SAVEPOINT apply_event');
      try {
        await applyWebhook(db,row.event_name,row.payload,row.received_at,env);
        await db.query('UPDATE github_webhook_deliveries SET processed_at=now(),processing_error=NULL,attempts=attempts+1 WHERE id=$1',[row.id]);
        processed++;
      } catch {
        await db.query('ROLLBACK TO SAVEPOINT apply_event');
        await db.query(`UPDATE github_webhook_deliveries SET processing_error='Event processing failed; reconciliation will repair source state',
          attempts=attempts+1,next_attempt_at=now()+($2::integer * interval '1 second') WHERE id=$1`,[row.id,Math.min(3600,2**Math.min(row.attempts+1,12))]);
        await bumpRevision(db);failed++;
      }
      await db.query('COMMIT');
    } catch (error) {await db.query('ROLLBACK');throw error;}
    finally {db.release();}
  }
  return {processed,failed};
}

