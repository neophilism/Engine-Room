# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 20 — Summary / Features / At a Glance accordions**

This milestone fills the expandable project drawer with three accessible native accordions. Summary uses registered project copy when available, Features explicitly reports when structured feature data is not yet registered, and At a Glance exposes lifecycle, repository count, active PRs, and remaining roadmap work.

Target post-merge progress: **20 / 40 planned PRs = 50%**.

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
