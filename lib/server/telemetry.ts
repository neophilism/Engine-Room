import { getRuntimeConfig, type EnvironmentSource } from "../config/env";
import { assertTelemetryScope } from "../telemetry/adapters";
import { TelemetryError, type TelemetryCredential, type TelemetryEnvelope } from "../telemetry/types";
import { getDatabasePool } from "./database";
import { persistOperationSamples } from "./operations";
import { applyIncidentTransition, persistIncident } from "./incidents";
import { applyReleaseTransition, persistRelease } from "./releases";

export async function ingestTelemetry(credential: TelemetryCredential, envelope: TelemetryEnvelope, payloadHash: string) {
  assertTelemetryScope(credential, envelope.records);
  if (!/^[a-f0-9]{64}$/.test(payloadHash)) throw new TelemetryError(400, "Invalid payload identity.");
  const client = await getDatabasePool().connect();
  try {
    await client.query("begin");
    const inserted = await client.query(`insert into telemetry_deliveries (project_id, environment, source, delivery_id, key_id, adapter, payload_hash, record_count)
      values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (project_id, environment, source, delivery_id) do nothing returning delivery_id`,
      [credential.projectId, credential.environment, credential.source, envelope.deliveryId, credential.id, credential.adapter, payloadHash, envelope.records.length]);
    if (!inserted.rows.length) {
      const previous = await client.query<{ payload_hash: string }>("select payload_hash from telemetry_deliveries where project_id=$1 and environment=$2 and source=$3 and delivery_id=$4", [credential.projectId, credential.environment, credential.source, envelope.deliveryId]);
      if (previous.rows[0].payload_hash !== payloadHash) throw new TelemetryError(409, "Delivery identity was reused with different content.");
      await client.query("commit"); return "duplicate" as const;
    }
    for (const record of envelope.records) {
      const scope = { projectId: credential.projectId, environment: credential.environment, source: credential.source };
      try {
        if (record.kind === "metric") await persistOperationSamples(client, [{ ...scope, externalId: record.externalId, metric: record.metric, value: record.value, observedAt: record.observedAt }]);
        else if (record.kind === "incident") await persistIncident(client, { ...scope, ...record.signal });
        else if (record.kind === "release") await persistRelease(client, scope.projectId, record.key, { commitSha: record.commitSha, environment: scope.environment }, scope.source);
        else if (record.kind === "incident-event") {
          const target = await client.query<{ id: string }>("select id from project_incidents where project_id=$1 and environment=$2 and source=$3 and external_id=$4", [scope.projectId, scope.environment, scope.source, record.externalId]);
          if (!target.rows[0]) throw new TelemetryError(409, "Incident target is unavailable in this source scope.");
          await applyIncidentTransition(client, target.rows[0].id, record.event);
        } else {
          const target = await client.query<{ id: string }>("select id from project_releases where project_id=$1 and environment=$2 and source=$3 and release_key=$4", [scope.projectId, scope.environment, scope.source, record.key]);
          if (!target.rows[0]) throw new TelemetryError(409, "Release target is unavailable in this source scope.");
          await applyReleaseTransition(client, target.rows[0].id, record.event);
        }
      } catch (error) {
        if (error instanceof TelemetryError || (error && typeof error === "object" && "code" in error)) throw error;
        throw new TelemetryError(409, "Record content or state conflicts with recorded source data.");
      }
    }
    await client.query("commit"); return "accepted" as const;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
export type TelemetryFeed = { projectName: string; environment: string; source: string; adapter: string; receivedAt: string; records: number };
export async function loadTelemetryFeeds(source: EnvironmentSource = process.env): Promise<{ source: "database" | "unconfigured" | "error"; feeds: TelemetryFeed[] }> {
  if (!getRuntimeConfig(source).databaseUrl) return { source: "unconfigured", feeds: [] };
  try {
    const result = await getDatabasePool(source).query<{ display_name: string; environment: string; source: string; adapter: string; received_at: Date; record_count: number }>(`select distinct on (d.project_id, d.environment, d.source) d.*, p.display_name
      from telemetry_deliveries d join projects p on p.id=d.project_id order by d.project_id, d.environment, d.source, d.received_at desc`);
    return { source: "database", feeds: result.rows.map((row) => ({ projectName: row.display_name, environment: row.environment, source: row.source, adapter: row.adapter, receivedAt: row.received_at.toISOString(), records: row.record_count })) };
  } catch { return { source: "error", feeds: [] }; }
}
