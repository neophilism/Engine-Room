# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 16 — Automatic project registration from approved development plans**

This milestone completes Phase II. An approved `.exechub/project.yml` can atomically register its GitHub repository, portfolio project, primary repository relationship, immutable plan version, milestones, and exact planned-PR roadmap units. Count-only manifests never guess GitHub PR mappings.

Target post-merge progress: **16 / 40 planned PRs = 40%**.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

See `docs/project-registration.md`, `docs/approved-plan-versioning.md`, and the approved 40-PR `docs/development-plan.md`.
