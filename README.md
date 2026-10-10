# Engine Room

**Full development plan and cross-account handoff:** [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md).

Engine Room is an invite-only executive software-portfolio control room for tracking real projects, GitHub development activity, verified development plans, deployments, service operations, releases, and monitoring.

## Development status

**The original, approved 40-PR Engine Room roadmap is merged (40/40).** Additional integration and production-monitoring changes are tracked separately. A merged roadmap is **not** evidence that every production acceptance gate has passed. The repository release remains `1.0.0-rc.1` until infrastructure testing, security review, and operational acceptance are recorded.

See [the original roadmap](docs/development-plan.md), [approved PR mappings](docs/approved-roadmap-mapping.md), [live source integration](docs/live-project-integration.md), and [production acceptance](docs/acceptance-evidence.md).

## Existing deployment target

- Site: [engine-room-1ec7.onrender.com](https://engine-room-1ec7.onrender.com/)
- Source: [neophilism/Engine-Room](https://github.com/neophilism/Engine-Room), branch `main`
- Health: [`/api/health`](https://engine-room-1ec7.onrender.com/api/health) — application response and Render release SHA, when available
- Readiness: [`/api/ready`](https://engine-room-1ec7.onrender.com/api/ready) — required schema/database check
- Public external probe: [GitHub Actions production availability](https://github.com/neophilism/Engine-Room/actions/workflows/production-availability.yml)

The external probe checks health, readiness, login, and unauthenticated-access protection every 15 minutes on a best-effort GitHub Actions schedule. **A passing public probe is not complete operational acceptance**, and scheduled jobs may be delayed. Render deployment must be verified in the **correct authorized Render project/service**; never substitute an unrelated workspace.

## Local development

Use Node.js 22+ and PostgreSQL. Copy `.env.example` to a private environment configuration and set `DATABASE_URL`. Never commit credentials.

```sh
npm install
npm run migrate
npm run dev
```

For production, the existing `npm start` launcher enforces migrations before starting Next.js. The process can load the live-source worker when configured. Consult [production release](docs/production-release.md) for setup and [private registered-user access](docs/registered-user-access.md) for the first administrator and invitations.

## Fresh data and operational boundaries

- GitHub reconciliation reads real repository and PR identifiers; authenticated polling can refresh every 15 minutes on an awake instance, while anonymous polling is slower.
- Signed GitHub webhooks are the preferred event-driven method. The endpoint, webhook secret, actual event deliveries, and post-deploy source freshness must be verified independently.
- Render, database, finance, usage, and user data have distinct source credentials and acceptance requirements. Missing or stale observations must never be rendered as success.
- Production sign-off requires verified backups/restores, monitoring alerts, credential handling, accessibility, security review, and measured runtime performance.

Quality gates include typecheck, lint, migrations, roadmap checks, unit/integration tests, build, and browser acceptance. See [production-availability monitoring](docs/production-availability.md) for independent public checks and release-identity verification.
