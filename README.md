# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 26 — Structured feature tracking**

Explicit approved-plan feature records are grouped as implemented, underway, or remaining from linked roadmap PR merge evidence. Features appear on individual dashboards, Home accordions, and search; repeated registrations are idempotent and cross-plan links are rejected.

Target post-merge progress: **26 / 40 planned PRs = 65%**.

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
