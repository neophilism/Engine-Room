# Engine Room schema initialization

Production uses Render's existing start command `npm run start -- --hostname 0.0.0.0 --port $PORT`. This now runs `scripts/start.mjs`, which requires a database URL, applies pending SQL migrations and starts Next.js only after successful schema setup.

Migrations are selected using a strict numeric four-digit filename matcher and a tested selector; an empty migration list fails startup. A PostgreSQL transaction, advisory lock and `engine_room_schema_migrations` table prevent races and reapplying versions. Set `DATABASE_URL_UNPOOLED` for schema migrations where possible; normal web reads use pooled `DATABASE_URL`.

The browser test server explicitly uses `ENGINE_ROOM_TEST_SERVER=1` to avoid connecting to a real database during CI. Never set this override on production.

Live deployment and readiness are distinct claims. Passing startup confirms migration scripts ran successfully, not that the live portfolio has imported repositories or fresh observability data.
