import type { PoolClient } from "pg";
import { getRuntimeConfig, type EnvironmentSource } from "../config/env";
import { validateReleaseEvent, type ReleaseEvent, type ReleaseState, type ReleasesOverview } from "../domain/releases";
import type { ReleaseTarget } from "../domain/project-readiness";
import { getDatabasePool } from "./database";

export async function persistRelease(client: Pick<PoolClient, "query">, projectId: string, key: string, target: ReleaseTarget, source = "internal") {
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(key) || !/^[A-Za-z0-9._-]{1,128}$/.test(source) || !/^[a-f0-9]{40}$/.test(target.commitSha) || !/^[a-z0-9-]{1,64}$/.test(target.environment)) throw new Error("Invalid release identity or target.");
  await client.query(`insert into project_releases (project_id, release_key, commit_sha, environment, source) values ($1, $2, $3, $4, $5)
    on conflict (project_id, environment, source, release_key) do nothing`, [projectId, key, target.commitSha, target.environment, source]);
  const result = await client.query<{ id: string; commit_sha: string }>("select id, commit_sha from project_releases where project_id = $1 and release_key = $2 and environment = $3 and source = $4", [projectId, key, target.environment, source]);
  if (result.rows[0].commit_sha !== target.commitSha) throw new Error("Existing release identity points to a different commit.");
  return result.rows[0].id;
}
export async function createRelease(projectId: string, key: string, target: ReleaseTarget) {
  const client = await getDatabasePool().connect();
  try {
    await client.query("begin");
    const id = await persistRelease(client, projectId, key, target);
    await client.query("commit"); return id;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function applyReleaseTransition(client: Pick<PoolClient, "query">, releaseId: string, event: ReleaseEvent) {
  validateReleaseEvent(event);
  const record = await client.query<{ state: ReleaseState; last_event_at: Date | null }>("select state, last_event_at from project_releases where id = $1 for update", [releaseId]);
  if (!record.rows[0]) throw new Error("Release does not exist.");
  const duplicate = await client.query<{ from_state: ReleaseState; to_state: ReleaseState; actor: string; evidence_url: string | null; occurred_at: Date }>("select * from project_release_events where release_id = $1 and event_key = $2", [releaseId, event.key]);
  if (duplicate.rows[0]) {
    const previous = duplicate.rows[0];
    if (previous.from_state !== event.from || previous.to_state !== event.to || previous.actor !== event.actor || (previous.evidence_url ?? undefined) !== event.evidenceUrl || previous.occurred_at.toISOString() !== new Date(event.occurredAt).toISOString()) throw new Error("Release event identity was reused with different content.");
    return { applied: false, state: record.rows[0].state };
  }
  if (record.rows[0].state !== event.from) throw new Error("Release state changed; transition precondition failed.");
  if (record.rows[0].last_event_at && new Date(event.occurredAt) < record.rows[0].last_event_at) throw new Error("Release events must preserve source time order.");
  await client.query("insert into project_release_events (release_id, event_key, from_state, to_state, actor, occurred_at, evidence_url) values ($1, $2, $3, $4, $5, $6, $7)", [releaseId, event.key, event.from, event.to, event.actor, event.occurredAt, event.evidenceUrl ?? null]);
  await client.query("update project_releases set state = $2, last_event_at = $3, updated_at = now() where id = $1", [releaseId, event.to, event.occurredAt]);
  return { applied: true, state: event.to };
}

export async function transitionRelease(releaseId: string, event: ReleaseEvent) {
  const client = await getDatabasePool().connect();
  try { await client.query("begin"); const result = await applyReleaseTransition(client, releaseId, event); await client.query("commit"); return result; }
  catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function loadReleasesOverview(source: EnvironmentSource = process.env): Promise<ReleasesOverview> {
  if (!getRuntimeConfig(source).databaseUrl) return { source: "unconfigured", releases: [] };
  try {
    const result = await getDatabasePool(source).query<{ id: string; project_id: string; display_name: string; slug: string; release_key: string; commit_sha: string; environment: string; state: ReleaseState; updated_at: Date }>(
      "select r.*, p.display_name, p.slug from project_releases r join projects p on p.id = r.project_id order by r.updated_at desc, r.id");
    return { source: "database", releases: result.rows.map((record) => ({ id: record.id, projectId: record.project_id, projectName: record.display_name, projectSlug: record.slug,
      key: record.release_key, commitSha: record.commit_sha, environment: record.environment, state: record.state, updatedAt: record.updated_at.toISOString() })) };
  } catch { return { source: "error", releases: [] }; }
}
