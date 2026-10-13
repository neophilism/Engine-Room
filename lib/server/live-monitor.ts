import type { PoolClient } from 'pg';
import type { LiveSnapshot,ProjectActivitySummary,PullRequestReadout,SourcePlanSummary,PlanItemReadout } from '../domain/live-monitor';
import { getDatabasePool } from './database';
import { STRUCTURED_PR_PATH } from '../sync/structured-pr-registry.mjs';

const iso=(value:Date|string|null)=>value?new Date(value).toISOString():null;

export async function loadLiveSnapshot():Promise<LiveSnapshot>{
  const db=getDatabasePool();
  const row=(await db.query(`SELECT l.*,c.github_reconciliation_enabled,c.github_reconciliation_interval_minutes,
    (SELECT count(*) FROM github_repository_sync s JOIN repositories r ON r.id=s.repository_id WHERE NOT r.archived) AS repositories,
    (SELECT count(*) FROM github_repository_sync s JOIN repositories r ON r.id=s.repository_id WHERE NOT r.archived AND last_success_at IS NULL) AS unsynchronized,
    (SELECT count(*) FROM github_repository_sync s JOIN repositories r ON r.id=s.repository_id WHERE NOT r.archived AND last_error IS NOT NULL) AS failed_repositories,
    (SELECT min(last_success_at) FROM github_repository_sync s JOIN repositories r ON r.id=s.repository_id WHERE NOT r.archived) AS oldest_sync,
    (SELECT max(last_success_at) FROM github_repository_sync s JOIN repositories r ON r.id=s.repository_id WHERE NOT r.archived) AS latest_sync,
    (SELECT count(*) FROM github_webhook_deliveries WHERE processed_at IS NULL) AS pending,
    (SELECT count(*) FROM github_webhook_deliveries WHERE processed_at IS NULL AND processing_error IS NOT NULL) AS failed_events,
    (SELECT count(*) FROM github_pull_requests WHERE state='open') AS open_prs,
    (SELECT count(*) FROM github_pull_requests WHERE state='open' AND checks_state='failing') AS failed_checks
    FROM engine_room_live_state l CROSS JOIN engine_room_control_settings c WHERE l.singleton=true AND c.singleton=true`)).rows[0];
  const authenticated=!!(process.env.GITHUB_READ_TOKEN?.trim()||process.env.GITHUB_APP_ID&&process.env.GITHUB_APP_PRIVATE_KEY&&process.env.GITHUB_INSTALLATION_ID);
  const pollingMinutes=Math.max(authenticated?15:120,row.github_reconciliation_interval_minutes);
  const oldest=iso(row.oldest_sync);
  const fresh=oldest && Date.now()-Date.parse(oldest)<(pollingMinutes+5)*60000;
  const workerFresh=row.last_worker_at && Date.now()-new Date(row.last_worker_at).getTime()<90000;
  return {revision:String(row.revision),state:!workerFresh?'disconnected':Number(row.pending)>0?'catching-up':
    !fresh||row.last_error||!row.github_reconciliation_enabled||Number(row.unsynchronized)>0||Number(row.failed_repositories)>0?'stale':'live',checkedAt:new Date().toISOString(),
    oldestSyncAt:oldest,latestSyncAt:iso(row.latest_sync),workerAt:iso(row.last_worker_at),repositories:Number(row.repositories),unsynchronized:Number(row.unsynchronized),
    failedRepositories:Number(row.failed_repositories),pendingEvents:Number(row.pending),failedEvents:Number(row.failed_events),
    webhookConfigured:!!process.env.GITHUB_WEBHOOK_SECRET,authenticatedGitHub:authenticated,renderConfigured:!!process.env.RENDER_API_KEY,
    pollingMinutes,openPrs:Number(row.open_prs),failedChecks:Number(row.failed_checks),rateLimitResetAt:iso(row.rate_limit_reset_at),
    workerError:row.last_error,reconciliationEnabled:row.github_reconciliation_enabled};
}

type RawPr={project_id:string;number:number;title:string;html_url:string;state:string;draft:boolean;head_sha:string|null;base_ref:string|null;
  checks_state:string;checks_observed_at:Date|null;checks_url:string|null;mergeable:boolean|null;updated_at:Date;merged_at:Date|null;default_branch:string;review_summary:string|null;
  default_branch_sha:string|null;release_included:boolean|null;release_target_sha:string|null};

export async function loadProjectMonitorData(db:Pick<PoolClient,'query'>,projectId?:string){
  const raw=await db.query<RawPr>(`SELECT pr.project_id,g.*,r.default_branch,s.default_branch_sha FROM github_pull_requests g
    JOIN repositories r ON r.id=g.repository_id JOIN project_repositories pr ON pr.repository_id=r.id
    LEFT JOIN github_repository_sync s ON s.repository_id=r.id
    WHERE ($1::uuid IS NULL OR pr.project_id=$1) ORDER BY (g.state='open') DESC,g.updated_at DESC`,[projectId||null]);
  const summaries=new Map<string,ProjectActivitySummary>();
  const pullRequests=new Map<string,PullRequestReadout[]>();
  for(const row of raw.rows){
    const summary=summaries.get(row.project_id)||{total:0,open:0,merged:0,drafts:0,failedChecks:0,runningChecks:0,lastObservedAt:null};
    summary.total++;summary.open+=Number(row.state==='open');summary.merged+=Number(!!row.merged_at);
    summary.drafts+=Number(row.state==='open'&&row.draft);summary.failedChecks+=Number(row.state==='open'&&row.checks_state==='failing');
    summary.runningChecks+=Number(row.state==='open'&&['queued','running'].includes(row.checks_state));
    summary.lastObservedAt=summary.lastObservedAt&&summary.lastObservedAt>iso(row.updated_at)!?summary.lastObservedAt:iso(row.updated_at);
    summaries.set(row.project_id,summary);
    const prs=pullRequests.get(row.project_id)||[];
    if(prs.length<100||row.state==='open')prs.push({number:row.number,title:row.title,url:row.html_url,state:row.merged_at?'merged':row.state,draft:row.draft,
      headSha:row.head_sha,baseRef:row.base_ref,checks:row.checks_state,checksAt:iso(row.checks_observed_at),checksUrl:row.checks_url,
      mergeable:row.mergeable,updatedAt:iso(row.updated_at)!,mergedAt:iso(row.merged_at),releaseMerge:!row.merged_at?null:row.base_ref===row.default_branch?true:
        row.default_branch_sha&&row.release_target_sha===row.default_branch_sha?row.release_included:null,reviewSummary:row.review_summary});
    pullRequests.set(row.project_id,prs);
  }
  const docResult=await db.query<{project_id:string;repository_id:string;repository_name:string;path:string;fingerprint:string;source_url:string;repository_url:string;title:string;imported_at:Date;versions:string}>(`SELECT DISTINCT ON(pr.project_id,d.repository_id,d.path)
    pr.project_id,d.*,r.name AS repository_name,r.html_url AS repository_url,count(*) OVER(PARTITION BY d.repository_id,d.path) AS versions FROM project_plan_documents d
    JOIN repositories r ON r.id=d.repository_id JOIN project_repositories pr ON pr.repository_id=d.repository_id WHERE ($1::uuid IS NULL OR pr.project_id=$1)
    ORDER BY pr.project_id,d.repository_id,d.path,d.version_id DESC`,[projectId||null]);
  const plans=new Map<string,SourcePlanSummary>();
  for(const doc of docResult.rows){
    // Historical paths remain in the audit database but only authoritative current
    // plan sources contribute to the denominator (avoid README + canonical double-counting).
    if(doc.path!==STRUCTURED_PR_PATH)continue;
    const plan=plans.get(doc.project_id)||{original:0,originalComplete:0,added:0,addedComplete:0,unmapped:0,items:[],documents:[]};
    plan.documents.push({path:doc.path,url:doc.source_url,title:doc.title,importedAt:iso(doc.imported_at)!,versions:Number(doc.versions)});
    const unitsSql=doc.path===STRUCTURED_PR_PATH ? `
      units AS (SELECT ordinal,title,scope,github_pr_numbers,contributing_pr_numbers,mapping_reason
        FROM project_plan_items WHERE repository_id=$1 AND path=$2 AND fingerprint=$3)` : `
      baseline AS (SELECT fingerprint FROM project_plan_documents WHERE repository_id=$1 AND path=$2 ORDER BY version_id LIMIT 1),
      additions AS (SELECT DISTINCT ON(c.ordinal,c.title) c.ordinal,c.title,c.github_pr_numbers,c.contributing_pr_numbers,c.mapping_reason
        FROM project_plan_items c JOIN project_plan_documents d USING(repository_id,path,fingerprint)
        WHERE c.repository_id=$1 AND c.path=$2 AND c.scope='addition' ORDER BY c.ordinal,c.title,d.version_id DESC),
      units AS (
        SELECT b.ordinal,b.title,b.scope,coalesce(c.github_pr_numbers,b.github_pr_numbers) AS github_pr_numbers,
          coalesce(c.contributing_pr_numbers,b.contributing_pr_numbers) AS contributing_pr_numbers,
          coalesce(c.mapping_reason,b.mapping_reason) AS mapping_reason
        FROM project_plan_items b JOIN baseline ON baseline.fingerprint=b.fingerprint
        LEFT JOIN project_plan_items c ON c.repository_id=b.repository_id AND c.path=b.path AND c.fingerprint=$3 AND c.ordinal=b.ordinal AND c.scope='original'
        WHERE b.repository_id=$1 AND b.path=$2 AND b.scope='original'
        UNION ALL
        SELECT c.ordinal,c.title,'addition',c.github_pr_numbers,c.contributing_pr_numbers,c.mapping_reason FROM additions c
      )`;
    const result=await db.query<{ordinal:number;title:string;scope:PlanItemReadout['scope'];github_pr_numbers:number[];contributing_pr_numbers:number[];mapping_reason:string|null;completed:boolean;underway:boolean;unverified:boolean}>(`WITH ${unitsSql} SELECT u.*,
      jsonb_array_length(github_pr_numbers)>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(u.github_pr_numbers) n
        LEFT JOIN github_pull_requests g ON g.repository_id=$1 AND g.number=n.value::integer
        WHERE g.merged_at IS NULL) AS completed,
      EXISTS(SELECT 1 FROM jsonb_array_elements_text(u.github_pr_numbers) n LEFT JOIN github_pull_requests g ON g.repository_id=$1 AND g.number=n.value::integer
        WHERE g.id IS NULL) AS unverified,
      (
        EXISTS(SELECT 1 FROM jsonb_array_elements_text(u.github_pr_numbers) n
          JOIN github_pull_requests g ON g.repository_id=$1 AND g.number=n.value::integer
          WHERE g.state='open')
        OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(u.contributing_pr_numbers) n
          JOIN github_pull_requests g ON g.repository_id=$1 AND g.number=n.value::integer
          WHERE g.merged_at IS NOT NULL OR g.state='open')
      ) AS underway
      FROM units u ORDER BY scope DESC,ordinal`,[doc.repository_id,doc.path,doc.fingerprint]);
    for(const item of result.rows){
      const completed=item.completed;
      if(item.scope==='original'){plan.original++;plan.originalComplete+=Number(completed);}
      else{plan.added++;plan.addedComplete+=Number(completed);}
      if(!item.github_pr_numbers.length||item.unverified)plan.unmapped++;
      plan.items.push({ordinal:item.ordinal,title:item.title,scope:item.scope,numbers:item.github_pr_numbers,
        contributingNumbers:item.contributing_pr_numbers,
        state:completed?'merged':item.unverified?'unmapped':item.underway?'in-progress':item.github_pr_numbers.length?'planned':'unmapped',
        reason:item.mapping_reason,sourceUrl:doc.source_url,repositoryUrl:doc.repository_url});
    }
    plans.set(doc.project_id,plan);
  }
  return {summaries,pullRequests,plans};
}

