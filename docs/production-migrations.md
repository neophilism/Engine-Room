# Engine Room schema initialization

Production uses Render's existing start command `npm run start -- --hostname 0.0.0.0 --port $PORT`. This now runs `scripts/start.mjs`, which requires a database URL, applies pending SQL migrations and starts Next.js only after successful schema setup.

Migrations are selected using a strict numeric four-digit filename matcher and a tested selector; an empty migration list fails startup. A PostgreSQL transaction, advisory lock and `engine_room_schema_migrations` table prevent races and reapplying versions. Set `DATABASE_URL_UNPOOLED` for schema migrations where possible; normal web reads use pooled `DATABASE_URL`.

The browser test server explicitly uses `ENGINE_ROOM_TEST_SERVER=1` to avoid connecting to a real database during CI. Never set this override on production.

Live deployment and readiness are distinct claims. Passing startup confirms migration scripts ran successfully, not that the live portfolio has imported repositories or fresh observability data.

## Live-monitor schema readiness (migration 0017)

The live dashboard's durable webhook inbox, per-repository synchronization, check runs and versioned plan history require migration `0017_live_monitor.sql`. The public `/api/ready` endpoint returns HTTP 503 if that migration or one of its required tables is absent; a successful JSON response includes `schemaVersion: "0017"`. HTTP 200 confirms schema availability only, not that GitHub, Render, operations, finance or external platform feeds are fresh. The process-only `/api/health` endpoint remains distinct.

The existing `npm start` migration runner applies SQL transactionally before boot. If readiness fails after a deployment, inspect startup migration logs in the **authorized Render workspace**; never manually fake a successful migration entry or point an unrelated service at this database. When recovery is necessary, rerun the documented migration process and verify its actual evidence.
