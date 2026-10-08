import { spawn, spawnSync } from "node:child_process";

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
