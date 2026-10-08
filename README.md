# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 18 — Stacked repository progress tubes and PR-count labels**

This milestone expands each portfolio project into repository-level roadmap progress. Multi-repository projects now render one live glass tube per repository with merged/planned PR labels and completion percentages, while preserving aggregate project totals.

Target post-merge progress: **18 / 40 planned PRs = 45%**.

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
