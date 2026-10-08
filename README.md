# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 36 — Cross-project access and security analytics**

Provider-scoped identities, organizations and roles are compared across projects. Freshness-aware review findings identify disabled or unknown privileged MFA, dormant grants, expired service credentials and broad access without inferring identity from shared names.

Target post-merge progress: **36 / 40 planned PRs = 90%**.

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
