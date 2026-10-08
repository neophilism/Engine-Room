import { selectMigrationFiles } from "./migration-files.mjs";
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";

// Fail startup rather than silently showing an uninitialized portfolio.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL (or DATABASE_URL_UNPOOLED) is required for migrations.");
  process.exit(1);
}
const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 15000 });
let client;
try {
  client = await pool.connect();
  // One transaction and an advisory lock keep parallel instances from racing.
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('engine_room_schema_migrations'))");
  await client.query(`CREATE TABLE IF NOT EXISTS engine_room_schema_migrations (
    version varchar(64) PRIMARY KEY,
    description text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const applied = await client.query("SELECT version FROM engine_room_schema_migrations");
  const versions = new Set(applied.rows.map(row => row.version));
  const files = selectMigrationFiles(await readdir("db/migrations"));
  if (files.length === 0) throw new Error("No migration files were found. Refusing to start with an uninitialized schema.");
  if (new Set(files.map(file => file.slice(0,4))).size !== files.length) throw new Error("Duplicate migration versions.");
  for (const file of files) {
    const version = file.split("_")[0];
    if (versions.has(version)) continue;
    const sql = await readFile(`db/migrations/${file}`, "utf8");
    await client.query(sql);
    await client.query(
      "INSERT INTO engine_room_schema_migrations (version, description) VALUES ($1, $2)",
      [version, file]
    );
    console.info(`Applied migration ${file}`);
  }
  await client.query("COMMIT");
  console.info("Database migrations current.");
} catch (error) {
  if (client) await client.query("ROLLBACK").catch(() => undefined);
  console.error("Database migration failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
