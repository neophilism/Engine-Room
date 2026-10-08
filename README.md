# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 12 — .exechub/project.yml development-plan manifest parser**

This milestone adds a strict parser for Engine Room's controlled repository manifest. It validates project identity, roadmap approval/version/counts, milestone structure, repository coordinates, and the approved planned-PR denominator.

Target post-merge progress: **12 / 40 planned PRs = 30%**.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

See `docs/project-manifest.md` and the approved 40-PR `docs/development-plan.md`.
