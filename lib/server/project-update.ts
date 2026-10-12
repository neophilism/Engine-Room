import type {PoolClient} from 'pg';
import type {ProjectUpdate} from '../domain/project-update';
export async function loadProjectUpdates(db:Pick<PoolClient,'query'>,projectId?:string) {
  const rows=await db.query<{project_id:string;kind:ProjectUpdate['kind'];occurred_at:Date|string;title:string;html_url:string;full_name:string;observed_at:Date|string}>(`
    SELECT DISTINCT ON(pr.project_id) pr.project_id,a.*,r.full_name FROM repository_latest_activity a
    JOIN repositories r ON r.id=a.repository_id JOIN project_repositories pr ON pr.repository_id=r.id
    WHERE ($1::uuid IS NULL OR pr.project_id=$1)
    ORDER BY pr.project_id,a.occurred_at DESC,a.observed_at DESC`,[projectId||null]);
  return new Map(rows.rows.map(row=>[row.project_id,{
    kind:row.kind,at:new Date(row.occurred_at).toISOString(),title:row.title,url:row.html_url,
    repository:row.full_name,observedAt:new Date(row.observed_at).toISOString()
  } satisfies ProjectUpdate]));
}
