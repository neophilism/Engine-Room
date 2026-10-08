# Engine Room production release and verification

This runbook defines the PR 40 release process. **It is not production acceptance evidence by itself.**

## Configuration in Render

Deploy a private Engine Room service linked to the `neophilism/Engine-Room` repository, branch `main`. Use Node 22 or newer, the repository's `npm install` and `npm run build`, and start with:

```sh
node scripts/migrate.mjs && npm run start -- --hostname 0.0.0.0 --port $PORT
```

Store `DATABASE_URL` and preferably a separate unpooled `DATABASE_URL_UNPOOLED` in Render secret configuration. Neon schema migration 0015 is required for the settings console. Set `ENGINE_ROOM_BASE_URL` to the HTTPS domain. Never use exposed credentials that have not been rotated.

Before enabling private operational/user/finance views, configure an organization-approved authentication/MFA gateway. **The application currently does not provide complete public-facing SSO/MFA; do not deploy privileged dashboards publicly.** The bootstrap administrator bearer credential protects control endpoints only, not the entire site.

## Live GitHub sources

The `scripts/sync-github.mjs` importer reads the public repositories owned by `ENGINE_ROOM_GITHUB_OWNER` (defaults to `neophilism`) and synchronizes their actual PR state into Neon. Run:

```sh
npm run sync:github
```

Schedule that command with a trusted Render cron job after the service is deployed and database access is working. The command is safe to repeat and uses real provider identifiers. An optional `GITHUB_READ_TOKEN` increases API limits.

For private repositories and approved manifest-based project registration, configure `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`, `GITHUB_WEBHOOK_SECRET`, and `ENGINE_ROOM_ADMIN_TOKEN`, then run a manual synchronization at `/settings`. An external authenticated scheduler is required for scheduled GitHub App reconciliations. Do not create synthetic roadmaps when no approved manifest exists.

## Acceptance and rollback

1. Run migrations against the designated Neon database; record migration logs.
2. Check `GET /api/health` and `GET /api/ready`. Only readiness tests schema availability.
3. Run a GitHub sync; verify repository counts, actual PR merge timestamps, and approved plan mappings.
4. Inspect dashboard source labels and confirm unknown finance, access, or telemetry fields are not presented as zero.
5. Configure provider-level backups, verify an actual restore using a non-production recovery database, and document RPO/RTO.
6. Confirm monitoring, alert routing, service restarts, rollback to prior deploy and evidence retention.
7. Run `npm run verify:production` with `ENGINE_ROOM_BASE_URL` set to the public HTTPS origin. This verifies only health/readiness and unauthenticated admin gating.

Record each test with timestamps, infrastructure identifiers, reviewer, and source evidence; do not mark missing exercises passed. Never log secrets or publish signed production data.

## Release gates remaining until observed

Authentication/MFA gateway, verified app deployment, migration execution, completed initial data sync, actual Neon restore, observability/alerts, accessibility audit, penetration testing, and production performance measurements require verified execution on the user's actual infrastructure.
