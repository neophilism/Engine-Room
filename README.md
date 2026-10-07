# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

The interface is intentionally built as a functional Victorian steampunk machine rather than a static themed image: progress is represented by live glass tubes, milestones by status lamps, and related data flows can be connected by responsive SVG pipework.

## Current milestone

**PR 3 — Portfolio domain model**

This milestone makes repositories, projects, development plans, milestones, and individual planned PRs first-class domain records.

It adds:

- a PostgreSQL persistence schema for portfolio roadmap entities;
- support for one primary and optional supporting repositories per project;
- explicit approved plan and milestone PR totals;
- planned-PR-to-GitHub-PR linkage;
- domain validation for roadmap consistency;
- the canonical progress rule: only merged **planned** PRs advance roadmap completion;
- tests for count integrity, merge state, milestone totals, and the 3/40 Engine Room state.

The branch shows the target post-merge self-tracking state for Engine Room as **3 / 40 planned PRs (7.5%)**. Live GitHub-derived state arrives later in the roadmap.

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when local database access is needed.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

See [docs/development-plan.md](docs/development-plan.md), [docs/architecture.md](docs/architecture.md), and [docs/domain-model.md](docs/domain-model.md).
