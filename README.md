# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 17 — Portfolio Overview foundation and live portfolio statistics**

This milestone replaces static demonstration roadmap data with a live PostgreSQL-backed portfolio overview. It reports tracked projects, active systems, merged/approved roadmap PRs, aggregate completion, and per-project progress while degrading truthfully when the database is unconfigured or unavailable.

Target post-merge progress: **17 / 40 planned PRs = 42.5%**.

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
