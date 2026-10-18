import type { PoolClient } from 'pg';
import { normalizePrSummary, type PullRequestSummary } from '../domain/pr-summary';
/** One grouped statement; empty repositories remain visible and PR numbers stay repository scoped. */
export async function loadPrSummaries(db:Pick<PoolClient,'query'>,projectId?:string) {
  const result=await db.query(`SELECT pr.project_id,
    count(g.id)::integer AS total,
    count(g.id) FILTER(WHERE g.state='open')::integer AS open,
    count(g.id) FILTER(WHERE g.state='closed')::integer AS closed,
    count(g.id) FILTER(WHERE g.merged_at IS NOT NULL)::integer AS merged,
    count(g.id) FILTER(WHERE g.state='closed' AND g.merged_at IS NULL)::integer AS "closedWithoutMerge",
    count(g.id) FILTER(WHERE g.state='open' AND g.draft)::integer AS drafts,
    CASE WHEN count(DISTINCT s.repository_id) FILTER(WHERE s.last_success_at IS NOT NULL)=count(DISTINCT r.id) THEN min(s.last_success_at) END AS observed_at
    FROM (SELECT DISTINCT project_id,repository_id FROM project_repositories) pr
    JOIN repositories r ON r.id=pr.repository_id
    LEFT JOIN github_repository_sync s ON s.repository_id=r.id
    LEFT JOIN github_pull_requests g ON g.repository_id=r.id
    WHERE ($1::uuid IS NULL OR pr.project_id=$1) GROUP BY pr.project_id`,[projectId||null]);
  return new Map<string,PullRequestSummary>(result.rows.map(row=>[row.project_id,normalizePrSummary({...row,
    observedAt:row.observed_at?new Date(row.observed_at).toISOString():null})]));
}
