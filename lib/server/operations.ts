import { getRuntimeConfig, type EnvironmentSource } from "../config/env";
import { validateOperationSample, type OperationsOverview, type OperationsProject, type OperationSample, type OperationMetric } from "../domain/operations";
import { getDatabasePool } from "./database";
import type { PoolClient } from "pg";

export async function persistOperationSamples(client: Pick<PoolClient, "query">, samples: readonly OperationSample[]) {
  samples.forEach(validateOperationSample);
  for (const sample of samples) await client.query(`insert into project_operation_samples (project_id, environment, metric, value, source, external_id, observed_at)
    values ($1, $2, $3, $4, $5, $6, $7) on conflict (project_id, environment, metric, source, external_id)
    do update set value = excluded.value, observed_at = excluded.observed_at, received_at = now()`,
  [sample.projectId, sample.environment, sample.metric, sample.value, sample.source, sample.externalId, sample.observedAt]);
}

export async function recordOperationSamples(samples: readonly OperationSample[]) {
  const client = await getDatabasePool().connect();
  try { await client.query("begin"); await persistOperationSamples(client, samples); await client.query("commit"); }
  catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function loadOperationsOverview(source: EnvironmentSource = process.env): Promise<OperationsOverview> {
  if (!getRuntimeConfig(source).databaseUrl) return { source: "unconfigured", projects: [], samples: [] };
  try {
    const client = await getDatabasePool(source).connect();
    try {
      await client.query("begin isolation level repeatable read read only");
      const projects = await client.query<OperationsProject>(`select id, slug, display_name as "displayName" from projects order by display_name`);
      const samples = await client.query<{ project_id: string; environment: string; metric: OperationMetric; value: number; source: string; external_id: string; observed_at: Date }>(
        "select distinct on (project_id, environment, metric) * from project_operation_samples order by project_id, environment, metric, observed_at desc, received_at desc");
      await client.query("commit");
      return { source: "database", projects: projects.rows, samples: samples.rows.map((sample) => ({ projectId: sample.project_id, environment: sample.environment, metric: sample.metric, value: Number(sample.value),
        source: sample.source, externalId: sample.external_id, observedAt: sample.observed_at.toISOString() })) };
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
  } catch { return { source: "error", projects: [], samples: [] }; }
}
