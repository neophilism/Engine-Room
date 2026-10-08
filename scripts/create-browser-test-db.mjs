import { Client } from "pg";

// Integration tests use ENGINE_ROOM_TEST_DATABASE_URL. Browser tests use a
// separate database so the startup migration runner can apply migrations
// exactly once, without colliding with fixtures created by integration tests.
const integrationUrl = process.env.ENGINE_ROOM_TEST_DATABASE_URL;
const browserUrl = process.env.ENGINE_ROOM_BROWSER_DATABASE_URL;
if (!integrationUrl || !browserUrl) {
  throw new Error("Both integration and browser test database URLs are required.");
}
const integration = new URL(integrationUrl);
const browser = new URL(browserUrl);
const database = decodeURIComponent(browser.pathname.slice(1));
if (!/^[a-z][a-z0-9_]{1,62}$/.test(database)) throw new Error("Invalid browser database name.");
if (database === decodeURIComponent(integration.pathname.slice(1))) {
  throw new Error("Browser tests must not share the integration database.");
}
const client = new Client({ connectionString: integrationUrl });
try {
  await client.connect();
  // CREATE DATABASE cannot execute inside a transaction; this script is
  // only called once for a fresh ephemeral CI Postgres instance.
  await client.query(`CREATE DATABASE "${database}"`);
  console.info("Created dedicated Playwright database.");
} finally {
  await client.end();
}
