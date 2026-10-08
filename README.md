# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 35 — Users and Access dashboard**

Source-scoped identity observations power a searchable Users and Access roster. Explicit roles, privilege, status, MFA unknowns, organization identity, and observation freshness preserve the difference between recorded access and inferred activity.

Target post-merge progress: **35 / 40 planned PRs = 87.5%**.

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
