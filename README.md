# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 8 — Animation, machine-state transitions, and reduced motion**

This milestone adds shared machine state, animated pipe flow, smooth instrument updates, and a keyboard-operable motion pause control. System reduced-motion preferences disable movement before hydration and during the session, while values, controls, and textual status continue updating immediately.

PR 7's responsive flow, manifold, and grid composition rules are preserved. The homepage includes an interactive animation preview with labeled sample values.

Target post-merge progress: **8 / 40 planned PRs = 20%**.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

See `docs/machine-animation.md`, `docs/machine-layout.md`, and the approved 40-PR `docs/development-plan.md`.

