# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 33 — Finance dashboard and financial model**

Currency-aware actuals and forecast snapshots power the Finance dashboard. Exact minor-unit arithmetic, immutable source identities, period filters, and coverage labels keep recorded values separate from missing data and estimates.

Target post-merge progress: **33 / 40 planned PRs = 82.5%**.

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
