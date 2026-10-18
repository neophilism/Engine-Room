import type {PoolClient} from 'pg';
export type PlanReconciliation={mergedUnlinked:number;mergedContributions:number;examples:string[]};
/** Diagnostic only: an unrelated merged PR is accepted without pretending to complete a package. */
export async function loadPlanReconciliation(db:Pick<PoolClient,'query'>){
 const rows=(await db.query(`WITH latest AS (SELECT DISTINCT ON(repository_id) repository_id,path,fingerprint
  FROM project_plan_documents WHERE path='registry/prs.json' ORDER BY repository_id,version_id DESC),
  observed AS (SELECT pr.project_id,r.full_name,g.number,
   EXISTS(SELECT 1 FROM latest d JOIN project_plan_items i ON i.repository_id=d.repository_id AND i.path=d.path AND i.fingerprint=d.fingerprint
     WHERE d.repository_id=r.id AND i.github_pr_numbers @> to_jsonb(g.number)) AS mapped,
   EXISTS(SELECT 1 FROM latest d JOIN project_plan_items i ON i.repository_id=d.repository_id AND i.path=d.path AND i.fingerprint=d.fingerprint
     WHERE d.repository_id=r.id AND i.contributing_pr_numbers @> to_jsonb(g.number)) AS contribution
   FROM project_repositories pr JOIN repositories r ON r.id=pr.repository_id JOIN github_pull_requests g ON g.repository_id=r.id WHERE g.merged_at IS NOT NULL)
  SELECT project_id,count(*) FILTER(WHERE NOT mapped AND NOT contribution)::integer AS unlinked,
    count(*) FILTER(WHERE contribution)::integer AS contributions,
    (array_agg(full_name||'#'||number ORDER BY full_name,number) FILTER(WHERE NOT mapped AND NOT contribution))[1:20] AS examples
  FROM observed GROUP BY project_id`)).rows;
 return new Map<string,PlanReconciliation>(rows.map(row=>[row.project_id,{mergedUnlinked:row.unlinked,mergedContributions:row.contributions,examples:row.examples??[]}]));
}
