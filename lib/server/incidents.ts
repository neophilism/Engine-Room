import type { PoolClient } from "pg";
import { getRuntimeConfig, type EnvironmentSource } from "../config/env";
import { validateIncidentEvent, validateIncidentSignal, type IncidentSignal, type IncidentEvent, type IncidentState, type IncidentSeverity, type IncidentsOverview } from "../domain/incidents";
import { getDatabasePool } from "./database";

export async function persistIncident(client: Pick<PoolClient, "query">, signal: IncidentSignal) {
  validateIncidentSignal(signal);
  await client.query(`insert into project_incidents (project_id, environment, source, external_id, title, severity, opened_at, last_event_at, evidence_url)
    values ($1, $2, $3, $4, $5, $6, $7, $7, $8) on conflict (project_id, environment, source, external_id) do nothing`,
  [signal.projectId, signal.environment, signal.source, signal.externalId, signal.title, signal.severity, signal.occurredAt, signal.evidenceUrl ?? null]);
  const result = await client.query<{ id: string; title: string; severity: IncidentSeverity; opened_at: Date; evidence_url: string | null }>(
    "select id, title, severity, opened_at, evidence_url from project_incidents where project_id = $1 and environment = $2 and source = $3 and external_id = $4",
    [signal.projectId, signal.environment, signal.source, signal.externalId]);
  const previous = result.rows[0];
  if (previous.title !== signal.title || previous.severity !== signal.severity || previous.opened_at.toISOString() !== new Date(signal.occurredAt).toISOString() || (previous.evidence_url ?? undefined) !== signal.evidenceUrl) throw new Error("Incident identity was reused with different content.");
  return previous.id;
}

export async function applyIncidentTransition(client: Pick<PoolClient, "query">, incidentId: string, event: IncidentEvent) {
  validateIncidentEvent(event);
  const record = await client.query<{ state: IncidentState; last_event_at: Date }>("select state, last_event_at from project_incidents where id = $1 for update", [incidentId]);
  if (!record.rows[0]) throw new Error("Incident does not exist.");
  const duplicate = await client.query<{ from_state: IncidentState; to_state: IncidentState; actor: string; note: string; occurred_at: Date; evidence_url: string | null }>(
    "select * from project_incident_events where incident_id = $1 and event_key = $2", [incidentId, event.key]);
  if (duplicate.rows[0]) {
    const previous = duplicate.rows[0];
    if (previous.from_state !== event.from || previous.to_state !== event.to || previous.actor !== event.actor || previous.note !== event.note || previous.occurred_at.toISOString() !== new Date(event.occurredAt).toISOString() || (previous.evidence_url ?? undefined) !== event.evidenceUrl) throw new Error("Incident event identity was reused with different content.");
    return { applied: false, state: record.rows[0].state };
  }
  if (record.rows[0].state !== event.from) throw new Error("Incident state changed; transition precondition failed.");
  if (new Date(event.occurredAt) < record.rows[0].last_event_at) throw new Error("Incident events must preserve source time order.");
  await client.query("insert into project_incident_events (incident_id, event_key, from_state, to_state, actor, note, occurred_at, evidence_url) values ($1, $2, $3, $4, $5, $6, $7, $8)",
    [incidentId, event.key, event.from, event.to, event.actor, event.note, event.occurredAt, event.evidenceUrl ?? null]);
  await client.query("update project_incidents set state = $2, last_event_at = $3, resolved_at = $4, updated_at = now() where id = $1", [incidentId, event.to, event.occurredAt, event.to === "resolved" ? event.occurredAt : null]);
  return { applied: true, state: event.to };
}

export async function recordIncident(signal: IncidentSignal) {
  const client = await getDatabasePool().connect();
  try { await client.query("begin"); const id = await persistIncident(client, signal); await client.query("commit"); return id; }
  catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
export async function transitionIncident(incidentId: string, event: IncidentEvent) {
  const client = await getDatabasePool().connect();
  try { await client.query("begin"); const result = await applyIncidentTransition(client, incidentId, event); await client.query("commit"); return result; }
  catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
export async function loadIncidentsOverview(source: EnvironmentSource = process.env): Promise<IncidentsOverview> {
  if (!getRuntimeConfig(source).databaseUrl) return { source: "unconfigured", incidents: [] };
  try {
    const result = await getDatabasePool(source).query<{ id: string; project_id: string; display_name: string; slug: string; environment: string; source: string; external_id: string; title: string; severity: IncidentSeverity; state: IncidentState; opened_at: Date; updated_at: Date; resolved_at: Date | null; evidence_url: string | null; last_note: string | null }>(
      `select i.*, p.display_name, p.slug, e.note as last_note from project_incidents i join projects p on p.id = i.project_id
       left join lateral (select note from project_incident_events where incident_id = i.id order by occurred_at desc, sequence desc limit 1) e on true
       order by (i.state = 'resolved'), i.updated_at desc, i.id`);
    return { source: "database", incidents: result.rows.map((row) => ({ id: row.id, projectId: row.project_id, projectName: row.display_name, projectSlug: row.slug, environment: row.environment,
      source: row.source, externalId: row.external_id, title: row.title, severity: row.severity, state: row.state, occurredAt: row.opened_at.toISOString(), updatedAt: row.updated_at.toISOString(), resolvedAt: row.resolved_at?.toISOString() ?? null, evidenceUrl: row.evidence_url ?? undefined, lastNote: row.last_note })) };
  } catch { return { source: "error", incidents: [] }; }
}
