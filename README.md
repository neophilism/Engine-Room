# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 21 — Total Portfolio Progress machine**

A weighted portfolio instrument now shows merged approved PRs, completion, underway work, and remaining work. The approved roadmap denominator stays fixed, repository stacks do not duplicate the totals, and the home page queries current data on each request.

Target post-merge progress: **21 / 40 planned PRs = 52.5%**.

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
