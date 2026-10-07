# Core application architecture

PR 2 establishes the architectural boundaries that the rest of Engine Room will build on.

## Routing

The application uses the Next.js App Router. Main dashboard routes are registered in `lib/navigation.ts` so the navigation model has one source of truth.

Current main routes:

- `/` — portfolio overview
- `/projects`
- `/finance`
- `/users`
- `/operations`
- `/releases`
- `/alerts`
- `/about`
- `/settings`
- `/api/health` — service health endpoint

The full shared desktop/tablet/mobile application shell is intentionally deferred to PR 4.

## Layers

- `app/` — routes and route handlers.
- `components/` — reusable presentation components.
- `lib/config/` — runtime configuration and validation.
- `lib/server/` — server-only infrastructure such as database connectivity.
- `db/migrations/` — ordered PostgreSQL schema migrations.
- `.exechub/` — Engine Room project metadata consumed by the future tracking engine.

## Database

PostgreSQL is the durable system of record. PR 2 introduces a lazy `pg` connection pool. Importing or building the application does not require a live database; a database URL is required only when a database operation is invoked.

PR 3 adds the first domain schema for repositories, projects, development plans, milestones, and planned PRs.

## Configuration

Runtime configuration is read in one place: `lib/config/env.ts`.

Supported variables in PR 2:

- `NODE_ENV`
- `DATABASE_URL`
- `ENGINE_ROOM_BASE_URL`
- `LOG_LEVEL`

Secrets are never committed. `.env.example` contains local placeholders only.

## Health

`GET /api/health` verifies that the application runtime is alive and reports whether database connectivity has been configured. A live database probe can be added once deployment infrastructure exists.

## Architectural rule

External systems such as GitHub, CI/CD providers, finance systems, hosting providers, and analytics services will be integrated behind adapters. Dashboard components consume normalized Engine Room data rather than vendor-specific payloads.
