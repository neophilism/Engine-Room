import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { getRuntimeConfig, type EnvironmentSource } from "../config/env";
import { validateAccessObservation, type AccessObservation, type AccessOverview, type PrincipalStatus } from "../domain/access";
import { getDatabasePool } from "./database";

export async function persistAccessObservations(client: Pick<PoolClient, "query">, records: readonly AccessObservation[]) {
  records.forEach(validateAccessObservation);
  for (const record of records) {
    const hash = createHash("sha256").update(JSON.stringify([record.principalId, record.displayName, record.principalKind, record.status, [...record.roles].sort(), record.privileged, record.mfaEnabled, record.lastActiveAt ? new Date(record.lastActiveAt).toISOString() : null, record.organizationId ?? null, record.organizationName ?? null, record.credentialExpiresAt ? new Date(record.credentialExpiresAt).toISOString() : null, new Date(record.observedAt).toISOString()])).digest("hex");
    const inserted = await client.query(`insert into project_access_observations (project_id,environment,source,external_id,principal_id,display_name,principal_kind,status,roles,privileged,mfa_enabled,last_active_at,organization_id,organization_name,credential_expires_at,observed_at,payload_hash)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) on conflict (project_id,environment,source,external_id) do nothing returning external_id`,
    [record.projectId, record.environment, record.source, record.externalId, record.principalId, record.displayName, record.principalKind, record.status, [...record.roles].sort(), record.privileged, record.mfaEnabled, record.lastActiveAt, record.organizationId ?? null, record.organizationName ?? null, record.credentialExpiresAt, record.observedAt, hash]);
    if (!inserted.rows.length) {
      const previous = await client.query<{ payload_hash: string }>("select payload_hash from project_access_observations where project_id=$1 and environment=$2 and source=$3 and external_id=$4", [record.projectId, record.environment, record.source, record.externalId]);
      if (previous.rows[0].payload_hash !== hash) throw new Error("Access observation identity was reused with different content.");
    }
  }
}
export async function recordAccessObservations(records: readonly AccessObservation[]) {
  const client = await getDatabasePool().connect();
  try { await client.query("begin"); await persistAccessObservations(client, records); await client.query("commit"); }
  catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
export async function loadAccessOverview(source: EnvironmentSource = process.env): Promise<AccessOverview> {
  if (!getRuntimeConfig(source).databaseUrl) return { source: "unconfigured", principals: [] };
  try {
    const result = await getDatabasePool(source).query<{ project_id: string; display_name: string; project_name: string; slug: string; environment: string; source: string; external_id: string; principal_id: string; principal_kind: "person" | "service"; status: PrincipalStatus; roles: string[]; privileged: boolean; mfa_enabled: boolean | null; last_active_at: Date | null; organization_id: string | null; organization_name: string | null; credential_expires_at: Date | null; observed_at: Date }>(
      `select distinct on (a.project_id,a.environment,a.source,a.principal_id) a.*, p.display_name as project_name, p.slug from project_access_observations a join projects p on p.id=a.project_id
       order by a.project_id,a.environment,a.source,a.principal_id,a.observed_at desc,a.received_at desc,a.external_id`);
    return { source: "database", principals: result.rows.map((row) => ({ projectId: row.project_id, projectName: row.project_name, projectSlug: row.slug, environment: row.environment, source: row.source, externalId: row.external_id,
      principalId: row.principal_id, displayName: row.display_name, principalKind: row.principal_kind, status: row.status, roles: row.roles, privileged: row.privileged, mfaEnabled: row.mfa_enabled, lastActiveAt: row.last_active_at?.toISOString() ?? null,
      organizationId: row.organization_id ?? undefined, organizationName: row.organization_name ?? undefined, credentialExpiresAt: row.credential_expires_at?.toISOString() ?? null, observedAt: row.observed_at.toISOString() })) };
  } catch { return { source: "error", principals: [] }; }
}
