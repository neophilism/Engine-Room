# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 11 — Repository/PR synchronization and periodic reconciliation**

This milestone adds normalized pull-request storage and a full-state GitHub reconciliation service. Webhooks remain the low-latency path; reconciliation is the anti-drift path that periodically re-reads authoritative repository and PR state.

Target post-merge progress: **11 / 40 planned PRs = 27.5%**.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

See `docs/github-reconciliation.md`, `docs/github-webhooks.md`, and the approved 40-PR `docs/development-plan.md`.
