# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 27 — Development activity timelines**

Project dashboards now show filterable GitHub PR, commit, issue, review, and workflow activity. Provider adapters and idempotent persistence collect bounded recent activity without allowing unrelated events to inflate roadmap progress.

Target post-merge progress: **27 / 40 planned PRs = 67.5%**.

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
