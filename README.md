# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 29 — Operations and Performance dashboard**

Current operational measurements now show availability, latency, throughput, errors, CPU, and memory by environment. Source identity, freshness, and explicit unknown readings prevent missing or stale telemetry from appearing healthy.

Target post-merge progress: **29 / 40 planned PRs = 72.5%**.

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
