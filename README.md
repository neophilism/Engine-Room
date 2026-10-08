# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 31 — Alerts and incidents dashboard**

Source-scoped incidents move through audited acknowledgement, containment, resolution, and reopening. Response notes, source timestamps, replay protection, and state preconditions preserve a trustworthy incident history.

Target post-merge progress: **31 / 40 planned PRs = 77.5%**.

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
