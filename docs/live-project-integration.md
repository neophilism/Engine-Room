# Connecting real projects

Engine Room uses a GitHub App installation to discover the actual repositories in scope and imports their current PRs. On each authenticated reconciliation it registers projects from approved `.exechub/project.yml` manifests; repositories without approved manifests are listed as unscored discovered projects. Unscored projects do not claim false 0%-completion for an unknown roadmap. Never invent plan totals.

## Production configuration

Provide `DATABASE_URL`, `DATABASE_URL_UNPOOLED` when available for schema migrations, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`, `GITHUB_WEBHOOK_SECRET`, `ENGINE_ROOM_ADMIN_TOKEN`, and an HTTPS `ENGINE_ROOM_BASE_URL`. Store all secrets in your provider's secret store, not in GitHub. Set `ENGINE_ROOM_TELEMETRY_KEYS` only after issuing scoped ingestion credentials.

## First run

Run `node scripts/migrate.mjs` and verify `GET /api/ready` (a database check). Authenticate to Settings and run **Synchronize now**. Confirm project names/repository links against GitHub. Set a scheduler to POST `{"mode":"scheduled"}` to `/api/admin/reconcile` with the administrative bearer credential. Setting the cadence in Settings is not itself a scheduler. Observe reconciliation results, then verify repository counts and approved plan mappings.

## Plan matching

An approved manifest defines project plan counts. Merged counts require a mapped actual GitHub PR number, which is intentionally not inferred from titles or arbitrary ordinal coincidences. Set mappings through an approved plan process. Without them, the imported repository and GitHub activity remain real, but approved progress is unverified.

## Other live platforms

The infrastructure and finance/user/telemetry adapters can only ingest real measurements after each platform issues its own scoped credential and source configuration. GitHub App access does not authorize reading Render, Neon, billing, customer data, or analytics from unrelated services. Those integrations are separate production acceptance tasks; never label them verified until a signed delivery has been received and displayed.
