import { spawn, spawnSync } from "node:child_process";
import { shouldRunPublicSync, PUBLIC_SYNC_INTERVAL_MS } from "./public-sync-policy.mjs";

const testServer = process.env.ENGINE_ROOM_TEST_SERVER === "1";
if (!testServer) {
  if (!(process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED)) {
    console.error("Production startup refused: DATABASE_URL must be configured.");
    process.exit(1);
  }
  const migration = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
    stdio: "inherit",
    env: process.env
  });
  if (migration.error || migration.status !== 0) {
    console.error("Production startup refused: database migrations did not complete.");
    process.exit(1);
  }
}

const server = spawn(process.execPath,
  ["node_modules/next/dist/bin/next", "start", ...process.argv.slice(2)],
  { stdio: "inherit", env: process.env });
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => { if (!server.killed) server.kill(signal); });
}
server.on("error", error => {
  console.error("Cannot start Next.js:", error.message);
  process.exitCode = 1;
});
server.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});


/**
 * Optional zero-extra-service-cost public GitHub refresh while this web
 * instance is awake. Official GitHub App webhooks remain the preferred
 * low-latency production source.
 */
if (shouldRunPublicSync(process.env, testServer)) {
  let syncing = false;
  const refresh = () => {
    if (syncing) return;
    syncing = true;
    const run = spawn(process.execPath, ["scripts/sync-github.mjs"], { stdio: "inherit", env: process.env });
    run.once("error", error => {
      console.error("Public GitHub synchronization could not start:", error.message);
      syncing = false;
    });
    run.once("exit", code => {
      syncing = false;
      if (code !== 0) {
        console.error("Public GitHub synchronization failed; existing records remain visible.");
        return;
      }
      // Apply the reviewed original 40-PR Engine Room mapping only after real PR records arrive.
      const roadmap = spawn(process.execPath, ["scripts/sync-approved-roadmap.mjs"], { stdio: "inherit", env: process.env });
      roadmap.once("error", error => console.error("Approved roadmap importer failed to start:", error.message));
      roadmap.once("exit", result => {
        if (result !== 0) console.error("Approved roadmap import failed; other real source records remain intact.");
      });
    });
  };
  const startup = setTimeout(refresh, 15000);
  startup.unref();
  const interval = setInterval(refresh, PUBLIC_SYNC_INTERVAL_MS);
  interval.unref();
}
