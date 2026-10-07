import { Pool } from "pg";
import { requireDatabaseUrl, type EnvironmentSource } from "../config/env";

let sharedPool: Pool | undefined;

export function getDatabasePool(source: EnvironmentSource = process.env) {
  if (!sharedPool) {
    sharedPool = new Pool({
      connectionString: requireDatabaseUrl(source),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });
  }
  return sharedPool;
}

export async function checkDatabaseConnection(source: EnvironmentSource = process.env) {
  const pool = getDatabasePool(source);
  const result = await pool.query<{ ok: number }>("select 1 as ok");
  return result.rows[0]?.ok === 1;
}

export async function closeDatabasePool() {
  if (!sharedPool) return;
  const pool = sharedPool;
  sharedPool = undefined;
  await pool.end();
}
