# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 25 — Individual project dashboards**

Projects now have live dashboards for their approved plan, milestones, repositories, and roadmap work. Portfolio counts resolve mapped PRs against real GitHub merge timestamps. Database-backed query regressions run against an isolated PostgreSQL service in CI.

Target post-merge progress: **25 / 40 planned PRs = 62.5%**.

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
