# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 10 — GitHub webhook ingestion and signed webhook validation**

This milestone adds a signed, idempotent GitHub webhook endpoint backed by a durable PostgreSQL delivery inbox. HMAC-SHA256 validation happens against the exact request body before JSON parsing or persistence.

Target post-merge progress: **10 / 40 planned PRs = 25%**.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

See `docs/github-webhooks.md`, `docs/github-integration.md`, and the approved 40-PR `docs/development-plan.md`.
