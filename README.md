# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 28 — Risks, next actions, and release readiness**

Project dashboards now show recorded risks, blockers, ordered next actions, and acceptance evidence scoped to an immutable release commit and environment. Missing or expired production evidence stays unknown even when roadmap work is complete.

Target post-merge progress: **28 / 40 planned PRs = 70%**.

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
