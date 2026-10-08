const base = process.env.ENGINE_ROOM_BASE_URL;
if (!base || !/^https:\/\//.test(base)) {
  console.error("Set ENGINE_ROOM_BASE_URL to the deployed HTTPS origin.");
  process.exit(1);
}
const url = new URL(base);
if (url.username || url.password || url.search || url.hash) throw new Error("Expected a plain HTTPS origin.");
const routes = [
  { path: "/api/health", allowed: [200] },
  { path: "/api/ready", allowed: [200] },
  { path: "/api/admin/settings", allowed: [401] }
];
let failed = false;
for (const route of routes) {
  try {
    const response = await fetch(new URL(route.path, url), {
      headers: { "Cache-Control": "no-store" },
      signal: AbortSignal.timeout(15000),
      redirect: "manual"
    });
    const ok = route.allowed.includes(response.status);
    console.log(JSON.stringify({ path: route.path, status: response.status, verdict: ok ? "passed" : "failed" }));
    if (!ok) failed = true;
  } catch {
    console.error(JSON.stringify({ path: route.path, verdict: "failed", reason: "unavailable" }));
    failed = true;
  }
}
if (failed) process.exitCode = 1;
