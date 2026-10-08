import { getDatabasePool } from "./database";

/** Takes an atomic per-installation lease. Scheduled calls also honor the configured cadence. */
export async function claimReconciliation(
  installationId: number,
  intervalMinutes: number,
  manual: boolean
): Promise<boolean> {
  const result = await getDatabasePool().query(
    `insert into engine_room_reconciliation_runs (installation_id, last_started_at, last_finished_at, status)
      values ($1, now(), null, 'running')
      on conflict (installation_id) do update set
        last_started_at=now(), last_finished_at=null, status='running'
      where (engine_room_reconciliation_runs.status <> 'running'
        or engine_room_reconciliation_runs.last_started_at < now() - interval '25 minutes')
        and ($2::boolean or engine_room_reconciliation_runs.last_started_at < now() - ($3::integer * interval '1 minute'))
      returning installation_id`,
    [installationId, manual, intervalMinutes]
  );
  return result.rowCount === 1;
}

export async function finishReconciliation(installationId: number, success: boolean) {
  await getDatabasePool().query(
    "update engine_room_reconciliation_runs set status=$2, last_finished_at=now() where installation_id=$1 and status='running'",
    [installationId, success ? "succeeded" : "failed"]
  );
}
