# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 14 — Planned-PR completion calculation engine**

This milestone connects synchronized GitHub pull-request state to approved roadmap units. Only mapped PRs with a real GitHub merge timestamp count toward completion; open, closed-unmerged, missing, or unmapped PRs never inflate the numerator.

Target post-merge progress: **14 / 40 planned PRs = 35%**.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

See `docs/planned-pr-completion.md` and the approved 40-PR `docs/development-plan.md`.
