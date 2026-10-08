# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 30 — Releases dashboard and pipeline machine**

Immutable release targets move through controlled, audited delivery states. The Releases dashboard renders responsive pipeline machines, while replay protection and source evidence guard approval, live, and rollback transitions.

Target post-merge progress: **30 / 40 planned PRs = 75%**.

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
