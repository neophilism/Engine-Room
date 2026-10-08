# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 9 — GitHub App integration foundation and repository discovery**

This milestone adds dependency-light GitHub App authentication, installation-token exchange, paginated repository discovery, normalized repository records, and runtime configuration for GitHub.com or compatible enterprise API endpoints.

Target post-merge progress: **9 / 40 planned PRs = 22.5%**.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

See `docs/github-integration.md` and the approved 40-PR `docs/development-plan.md`.
