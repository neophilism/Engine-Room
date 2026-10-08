import type { PoolClient } from "pg";
import { featureStatus, validateFeatureDefinitions, type FeatureDefinition, type ProjectFeature } from "../domain/project-features";
import { getDatabasePool } from "./database";

type FeatureRow = { id: string; project_id: string; feature_key: string; title: string; description: string | null; planned_count: string; merged_count: string; open_count: string };

export async function loadCurrentFeatures(client: Pick<PoolClient, "query">, projectId?: string): Promise<ProjectFeature[]> {
  const result = await client.query<FeatureRow>(`select f.id, dp.project_id, f.feature_key, f.title, f.description,
    count(fp.planned_pull_request_id) as planned_count,
    count(fp.planned_pull_request_id) filter (where gpr.merged_at is not null) as merged_count,
    count(fp.planned_pull_request_id) filter (where gpr.state = 'open' and gpr.merged_at is null) as open_count
    from project_features f join development_plans dp on dp.id = f.development_plan_id and dp.status = 'approved'
    left join feature_planned_pull_requests fp on fp.feature_id = f.id
    left join planned_pull_requests ppr on ppr.id = fp.planned_pull_request_id
    left join github_pull_requests gpr on gpr.repository_id = ppr.repository_id and gpr.number = ppr.github_pr_number
    where ($1::uuid is null or dp.project_id = $1) group by f.id, dp.project_id order by f.ordinal, f.feature_key`, [projectId ?? null]);
  return result.rows.map((row) => {
    const planned = Number(row.planned_count), merged = Number(row.merged_count), open = Number(row.open_count);
    return { id: row.id, projectId: row.project_id, key: row.feature_key, title: row.title, description: row.description ?? undefined,
      planned, merged, open, status: featureStatus(planned, merged, open) };
  });
}

export async function registerProjectFeatures(planId: string, definitions: readonly FeatureDefinition[]) {
  validateFeatureDefinitions(definitions);
  const client = await getDatabasePool().connect();
  try {
    await client.query("begin");
    const plan = await client.query("select id from development_plans where id = $1 and status = 'approved' for update", [planId]);
    if (!plan.rows[0]) throw new Error("Features require a current approved plan.");
    const work = await client.query<{ id: string; ordinal: number }>("select id, ordinal from planned_pull_requests where development_plan_id = $1", [planId]);
    const byOrdinal = new Map(work.rows.map((pr) => [pr.ordinal, pr.id]));
    for (const [index, definition] of definitions.entries()) {
      if (definition.plannedPrOrdinals.some((ordinal) => !byOrdinal.has(ordinal))) throw new Error("Feature references a roadmap ordinal outside this approved plan.");
      const feature = await client.query<{ id: string }>(`insert into project_features (development_plan_id, feature_key, title, description, ordinal)
        values ($1, $2, $3, $4, $5) on conflict (development_plan_id, feature_key) do update set title = excluded.title, description = excluded.description, ordinal = excluded.ordinal returning id`,
      [planId, definition.key, definition.title.trim(), definition.description ?? null, index + 1]);
      const featureId = feature.rows[0].id;
      await client.query("delete from feature_planned_pull_requests where feature_id = $1", [featureId]);
      for (const ordinal of definition.plannedPrOrdinals) await client.query("insert into feature_planned_pull_requests (feature_id, development_plan_id, planned_pull_request_id) values ($1, $2, $3)", [featureId, planId, byOrdinal.get(ordinal)]);
    }
    await client.query("commit");
    return { registered: definitions.length };
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
