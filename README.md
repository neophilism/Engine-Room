# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 19 — Project expansion control and animated drawer**

This milestone turns each project disclosure control into a keyboard-operable right-arrow/down-arrow expander with an animated detail drawer. Repository progress tubes remain continuously visible; the drawer adds lifecycle, repository, underway-PR, and remaining-PR detail without changing roadmap calculations. Global reduced-motion rules remove the transition automatically.

Target post-merge progress: **19 / 40 planned PRs = 47.5%**.

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
