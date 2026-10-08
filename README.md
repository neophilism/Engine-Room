# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 34 — Financial adapters and flow visualization**

Signed JSON and CSV adapters import exact cost, revenue, and forecast amounts. The Finance dashboard adds an accessible financial-flow machine and recorded cost-driver bars without currency conversion or inferred missing values.

Target post-merge progress: **34 / 40 planned PRs = 85%**.

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
