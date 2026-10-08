# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 13 — Versioned approved-development-plan model**

This milestone makes approved roadmaps durable and auditable. Exact approved manifest snapshots are fingerprinted, versioned, and protected from identity mutation; importing the same approval twice is idempotent, while a material change creates a new version and supersedes the prior current plan.

Target post-merge progress: **13 / 40 planned PRs = 32.5%**.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

See `docs/approved-plan-versioning.md` and the approved 40-PR `docs/development-plan.md`.
