import { spawn, spawnSync } from "node:child_process";
import { shouldRunPublicSync } from "./public-sync-policy.mjs";

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


// Durable inbox and incremental reconciliation share the existing web service.
if (!testServer && process.env.ENGINE_ROOM_LIVE_WORKER !== "0") {
  let stopping=false,worker,restartTimer;
  const launch=()=>{
    if(stopping)return;
    worker=spawn(process.execPath,["scripts/live-worker.mjs"],{stdio:"inherit",env:{...process.env,
      ENGINE_ROOM_PUBLIC_GITHUB_SYNC:shouldRunPublicSync(process.env,testServer)?"1":"0"}});
    worker.once("error",()=>console.error("Live worker unavailable; dashboard will show disconnected source state."));
    worker.once("exit",()=>{if(!stopping){console.error("Live worker stopped; restarting; durable inbox preserved.");restartTimer=setTimeout(launch,5000);}});
  };
  const stop=(signal="SIGTERM")=>{stopping=true;clearTimeout(restartTimer);if(worker&&!worker.killed)worker.kill(signal);};
  for(const signal of ["SIGTERM","SIGINT"])process.on(signal,()=>stop(signal));
  server.once("exit",()=>stop());
  launch();
}
