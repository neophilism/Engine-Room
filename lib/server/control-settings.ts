import { getRuntimeConfig } from "../config/env";
import {
  defaultControlSettings,
  type ControlSettings
} from "../domain/control-settings";
import { getDatabasePool } from "./database";

type StoredSettings = {
  revision: number;
  github_reconciliation_enabled: boolean;
  github_reconciliation_interval_minutes: number;
};

type AuditRow = {
  revision: number;
  actor: string;
  previous_settings: ControlSettings;
  new_settings: ControlSettings;
  changed_at: Date;
};

type RunRow = {
  installation_id: string;
  status: "running" | "succeeded" | "failed";
  last_started_at: Date;
  last_finished_at: Date | null;
};

export class StaleSettingsRevision extends Error {}

function normalize(row: StoredSettings) {
  return {
    revision: row.revision,
    settings: {
      githubReconciliationEnabled: row.github_reconciliation_enabled,
      githubReconciliationIntervalMinutes: row.github_reconciliation_interval_minutes
    } satisfies ControlSettings
  };
}

export async function readControlSettings() {
  const result = await getDatabasePool().query<StoredSettings>(
    "select revision, github_reconciliation_enabled, github_reconciliation_interval_minutes from engine_room_control_settings where singleton = true"
  );
  if (!result.rows[0]) throw new Error("Control-settings migration is missing.");
  return normalize(result.rows[0]);
}

export async function loadControlSnapshot() {
  const pool = getDatabasePool();
  const [controls, audit, runs,admins,checkpoints] = await Promise.all([
    readControlSettings(),
    pool.query<AuditRow>(
      "select revision, actor, previous_settings, new_settings, changed_at from engine_room_control_audit order by revision desc limit 8"
    ),
    pool.query<RunRow>(
      "select installation_id::text as installation_id, status, last_started_at, last_finished_at from engine_room_reconciliation_runs order by last_started_at desc limit 8"
    ),
    pool.query<{present:boolean}>("SELECT EXISTS(SELECT 1 FROM engine_room_users WHERE role='admin' AND NOT disabled) AS present"),
    pool.query<{full_name:string;last_success_at:Date|null;last_error:string|null}>("SELECT r.full_name,s.last_success_at,s.last_error FROM github_repository_sync s JOIN repositories r ON r.id=s.repository_id WHERE NOT r.archived ORDER BY s.last_success_at NULLS FIRST,r.full_name")
  ]);
  const runtime = getRuntimeConfig();
  return {
    ...controls,
    integration: {
      database: Boolean(runtime.databaseUrl),
      githubApp: Boolean(runtime.github.appId && runtime.github.privateKey),
      githubWebhook: Boolean(runtime.github.webhookSecret),
      githubInstallation: Boolean(process.env.GITHUB_INSTALLATION_ID),
      telemetry: Boolean(process.env.ENGINE_ROOM_TELEMETRY_KEYS && process.env.ENGINE_ROOM_TELEMETRY_KEYS !== "[]"),
      githubRead: Boolean(process.env.GITHUB_READ_TOKEN || runtime.github.appId&&runtime.github.privateKey&&process.env.GITHUB_INSTALLATION_ID),
      adminAccess: Boolean(admins.rows[0]?.present || process.env.ENGINE_ROOM_ADMIN_TOKEN && process.env.ENGINE_ROOM_ADMIN_TOKEN.length >= 32)
    },
    audit: audit.rows.map((row) => ({
      revision: row.revision,
      actor: row.actor,
      previous: row.previous_settings,
      next: row.new_settings,
      changedAt: row.changed_at.toISOString()
    })),
    repositorySync:checkpoints.rows.map(row=>({fullName:row.full_name,lastSuccessAt:row.last_success_at?.toISOString()||null,lastError:row.last_error})),
    reconciliationRuns: runs.rows.map((row) => ({
      installationId: row.installation_id,
      status: row.status,
      startedAt: row.last_started_at.toISOString(),
      finishedAt: row.last_finished_at?.toISOString() ?? null
    }))
  };
}

export async function updateControlSettings(expectedRevision: number, settings: ControlSettings,actor='admin-token') {
  const client = await getDatabasePool().connect();
  try {
    await client.query("begin");
    const result = await client.query<StoredSettings>(
      "select revision, github_reconciliation_enabled, github_reconciliation_interval_minutes from engine_room_control_settings where singleton = true for update"
    );
    if (!result.rows[0]) throw new Error("Control-settings migration is missing.");
    const previous = normalize(result.rows[0]);
    if (previous.revision !== expectedRevision) throw new StaleSettingsRevision("Settings were updated elsewhere. Reload the current revision.");
    if (JSON.stringify(previous.settings) === JSON.stringify(settings)) {
      await client.query("commit");
      return previous;
    }
    const revision = previous.revision + 1;
    await client.query(
      "update engine_room_control_settings set revision=$1, github_reconciliation_enabled=$2, github_reconciliation_interval_minutes=$3, changed_at=now() where singleton=true",
      [revision, settings.githubReconciliationEnabled, settings.githubReconciliationIntervalMinutes]
    );
    await client.query(
      "insert into engine_room_control_audit (revision, actor, previous_settings, new_settings) values ($1, $2, $3::jsonb, $4::jsonb)",
      [revision,actor, JSON.stringify(previous.settings), JSON.stringify(settings)]
    );
    await client.query("commit");
    return { revision, settings };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export { defaultControlSettings };
