// Credential-free public production probe. This is availability evidence, not security acceptance.
const origin = process.env.ENGINE_ROOM_PUBLIC_URL || "https://engine-room-1ec7.onrender.com";
const expectedCommit = (process.env.EXPECTED_COMMIT || "").trim();
const parsed = new URL(origin);
if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
  throw new Error("ENGINE_ROOM_PUBLIC_URL must be an HTTPS origin without credentials or a path");
}
if (expectedCommit && !/^[0-9a-f]{40}$/i.test(expectedCommit)) {
  throw new Error("EXPECTED_COMMIT must be an exact 40-character Git commit SHA");
}
const base = parsed.origin;
const notes = ["Engine Room public probe — " + new Date().toISOString()];
const pause = delay => new Promise(resolve => setTimeout(resolve, delay));

async function request(path) {
  let failure = "No response";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(base + path, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(55_000),
        headers: { Accept: path.startsWith("/api/") ? "application/json" : "text/html" }
      });
      // Do not retry a live application returning an unexpected response: report the real failure.
      return response;
    } catch (error) {
      failure = error instanceof Error ? error.message : "Network request failed";
      if (attempt < 3) await pause(8_000);
    }
  }
  throw new Error(path + " unreachable after 3 attempts: " + failure);
}

async function json(path) {
  const response = await request(path);
  if (response.status !== 200) throw new Error(path + " HTTP " + response.status + ", expected 200");
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error(path + " returned non-JSON content");
  try { return await response.json(); }
  catch { throw new Error(path + " returned invalid JSON"); }
}

try {
  const health = await json("/api/health");
  if (health.status !== "ok" || health.service !== "engine-room" || health.database?.configured !== true) {
    throw new Error("/api/health did not confirm the Engine Room service and database configuration");
  }
  const ready = await json("/api/ready");
  if (ready.status !== "ready") throw new Error("/api/ready did not confirm database readiness");
  const login = await request("/login");
  if (login.status !== 200) throw new Error("/login HTTP " + login.status + ", expected 200");
  const root = await request("/");
  const location = root.headers.get("location");
  if (![302, 303, 307, 308].includes(root.status) || !location || new URL(location, base).pathname !== "/login") {
    throw new Error("/ did not redirect an unauthenticated visitor to /login");
  }
  const deployed = health.release?.commit || null;
  if (expectedCommit && deployed?.toLowerCase() !== expectedCommit.toLowerCase()) {
    throw new Error("Deployed commit " + (deployed || "unreported") + " differs from expected " + expectedCommit);
  }
  notes.push("Health: HTTP 200", "Database readiness: HTTP 200", "Login: HTTP 200",
    "Unauthenticated portfolio access: redirected to /login",
    "Render deployed commit: " + (deployed || "not reported by this release"),
    "Expected commit: " + (expectedCommit || "not specified"));
  console.log(notes.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(process.env.GITHUB_STEP_SUMMARY, notes.map(x => "- " + x).join("\n") + "\n");
  }
} catch (error) {
  console.error("Engine Room production probe failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
