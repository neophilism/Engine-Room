import type { PoolClient } from "pg";
import type { SourcePlanSummary } from "../domain/live-monitor";
import type { TimeEvidence } from "../domain/time-completion";

type OriginRow={
  project_id:string;full_name:string;github_created_at:Date|null;
  first_pr_created_at:Date|null;last_success_at:Date|null
};
type Origin={ startedAt:string|null; startBasis:TimeEvidence["startBasis"];syncedAt:string|null };
export type ProjectOrigin={ project:Origin;repositories:Map<string,Origin> };
const iso=(d:Date|null)=>d?new Date(d).toISOString():null;

/**
 * Project registration time is NOT project inception. Prefer source-verified
 * GitHub repository creation; use first observed PR creation only when absent.
 * An unobserved start stays unknown rather than becoming today's date.
 */
export async function loadProjectOrigins(db:Pick<PoolClient,"query">,projectId?:string) {
  const result=await db.query<OriginRow>(
    `SELECT pr.project_id,r.full_name,r.github_created_at,
       min(g.created_at) AS first_pr_created_at,s.last_success_at
     FROM project_repositories pr JOIN repositories r ON r.id=pr.repository_id
     LEFT JOIN github_pull_requests g ON g.repository_id=r.id
     LEFT JOIN github_repository_sync s ON s.repository_id=r.id
     WHERE ($1::uuid IS NULL OR pr.project_id=$1)
     GROUP BY pr.project_id,r.id,s.last_success_at`,[projectId??null]);
  const byProject=new Map<string,ProjectOrigin>();
  for(const row of result.rows){
    const timestamp=row.github_created_at??row.first_pr_created_at;
    const origin:Origin={startedAt:iso(timestamp),
      startBasis:row.github_created_at?"repository-created":row.first_pr_created_at?"first-pr":undefined,
      syncedAt:iso(row.last_success_at)};
    const record=byProject.get(row.project_id)??{project:{startedAt:null,startBasis:undefined,syncedAt:null},repositories:new Map<string,Origin>()};
    record.repositories.set(row.full_name,origin);
    const start=record.project.startedAt;
    if(origin.startedAt && (!start || origin.startedAt<start)){
      record.project.startedAt=origin.startedAt;
      record.project.startBasis=origin.startBasis;
    }
    // Oldest successful source refresh governs portfolio freshness. A missing
    // sync timestamp is unknown, not a fresh observation.
    record.project.syncedAt=record.project.syncedAt===null?origin.syncedAt:
      origin.syncedAt===null?null:origin.syncedAt<record.project.syncedAt?origin.syncedAt:record.project.syncedAt;
    byProject.set(row.project_id,record);
  }
  return byProject;
}

/** Only accepted source-owned plan units supply throughput samples. */
export function timeEvidenceFromPlan(
  plan:SourcePlanSummary|undefined, origin:Origin|undefined, repositoryFullName?:string
):TimeEvidence{
  return {startedAt:origin?.startedAt,startBasis:origin?.startBasis,syncedAt:origin?.syncedAt,
    accepted:(plan?.items??[]).filter(item=>item.state==="merged"&&item.completedAt&&
      (!repositoryFullName||item.repositoryFullName===repositoryFullName))
      .map(item=>({openedAt:item.openedAt,completedAt:item.completedAt!}))};
}
