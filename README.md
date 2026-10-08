# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 15 — Milestone completion and lifecycle-state calculation**

This milestone derives milestone progress/status from the immutable approved plan and merged planned PRs, then derives conservative project development lifecycle state without overwriting explicit operational or administrative states.

Target post-merge progress: **15 / 40 planned PRs = 37.5%**.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

See `docs/milestone-lifecycle.md`, `docs/planned-pr-completion.md`, and the approved 40-PR `docs/development-plan.md`.
