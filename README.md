# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 32 — Generic telemetry ingestion and adapters**

Signed, bounded telemetry deliveries normalize operational metrics, incident responses, and release events. Source credentials enforce project, environment, adapter, and capability scope; receipts and atomic batches guard retries and partial imports.

Target post-merge progress: **32 / 40 planned PRs = 80%**.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

See the approved 40-PR `docs/development-plan.md`.
