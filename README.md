# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 24 — Lifecycle lanes and stage lights**

Eight live lifecycle cards show stage counts, projects, and mechanical indicator lamps. Stage controls filter the comparison table without confusing roadmap completion with production deployment.

Target post-merge progress: **24 / 40 planned PRs = 60%**.

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
