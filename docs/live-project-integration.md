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

## Production public GitHub import default

When NODE_ENV=production and ENGINE_ROOM_TEST_SERVER is unset, the Engine Room web process automatically imports the owner's public non-fork repositories and their real pull requests shortly after startup, then once every two hours while the instance is awake. This does not need GitHub App secrets or a paid cron service, but is best effort on sleeping free-tier services and GitHub rate limits. Set ENGINE_ROOM_PUBLIC_GITHUB_SYNC=0 to opt out, or ENGINE_ROOM_PUBLIC_GITHUB_SYNC=1 to enable explicitly in development. Errors leave prior data intact and are logged. The approved Engine Room PR mapping is imported only after a successful GitHub synchronization. Reconciliation is not equivalent to production service monitoring.

## Fireside Chat public archive metrics

Engine Room now reads real, public (not administrative) archive statistics from `https://fireside-chat-preview.onrender.com/api/archive-stats`, an existing endpoint in `neophilism/FiresideChat`. The counts of active shows, episodes and integer total hours are validated and displayed as source observations with explicit timestamps, refreshed at most every five minutes while the Engine Room homepage is open. A failed call is shown as `Unverified`, not zero. No podcasts or listening activity are invented, and this feed does not expose private user analytics. Publicly available archive hours are the sum of episode durations, not the number of hours individual visitors listened. Private usage and revenue integration require consented scoped credentials and separate security gates.

## Public GitHub import freshness readout

The portfolio home checks `/api/public-github-status` against Engine Room's own PostgreSQL database. It reports the count of observed public repositories, observed real PR records, verified PR merge timestamps and latest PR observation time for the configured owner. These are persisted observations, not an assertion that the last complete import succeeded or that every repository is currently synchronized. The readout explicitly distinguishes no observed records, missing DB configuration and query failure. It does not expose private repository names or confidential operational metadata.
