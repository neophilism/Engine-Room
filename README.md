# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 22 — Portfolio search, filters, sorting, activity, and GitHub links**

The portfolio can be searched, filtered by lifecycle, and sorted by progress or active work. Repository links and mapped-PR activity labels make each row actionable. Visible pages refresh current server data every 30 seconds while preserving their controls.

Target post-merge progress: **22 / 40 planned PRs = 55%**.

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
