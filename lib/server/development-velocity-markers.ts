import { getDatabasePool } from "./database";

export class InvalidVelocityMarker extends Error {}

export function parseVelocityMarkerDate(input: unknown, today = new Date()): string | null {
  if (input === null) return null;
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new InvalidVelocityMarker("Enter the actual Boardroom start date as YYYY-MM-DD (UTC).");
  }
  const date = new Date(input + "T00:00:00.000Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input ||
      input > today.toISOString().slice(0, 10)) {
    throw new InvalidVelocityMarker("Choose a valid date no later than today.");
  }
  return input;
}

/** Only authenticated administrators can record or clear the audit-tracked milestone. */
export async function saveBoardroomActivation(date: string | null, actor: string) {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ effective_date: Date | string }>(
      "SELECT to_char(effective_date,'YYYY-MM-DD') AS effective_date FROM development_velocity_markers WHERE key='boardroom-rollout' FOR UPDATE"
    );
    const oldDate = current.rows[0]?.effective_date ?? null;
    if (oldDate !== date) {
      if (date === null) {
        await client.query("DELETE FROM development_velocity_markers WHERE key='boardroom-rollout'");
      } else {
        await client.query(
          "INSERT INTO development_velocity_markers (key,effective_date,recorded_by) " +
          "VALUES ('boardroom-rollout',$1::date,$2) " +
          "ON CONFLICT (key) DO UPDATE SET effective_date=excluded.effective_date," +
          " recorded_by=excluded.recorded_by,recorded_at=now()",
          [date,actor]
        );
      }
      await client.query(
        "INSERT INTO development_velocity_marker_audit " +
        "(marker_key,previous_date,new_date,changed_by) " +
        "VALUES ('boardroom-rollout',$1::date,$2::date,$3)",
        [oldDate,date,actor]
      );
    }
    await client.query("COMMIT");
    return { boardroomStartDate: date, changed: oldDate !== date };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
