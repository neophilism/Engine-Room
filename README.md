# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 23 — Projects comparison dashboard**

The Projects route now compares approved roadmaps, merged and underway work, remaining PRs, repository counts, and lifecycle stages in a responsive semantic table. Shared filters and automatic refresh keep it aligned with the portfolio home.

Target post-merge progress: **23 / 40 planned PRs = 57.5%**.

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
