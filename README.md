# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

The interface is intentionally built as a functional Victorian steampunk machine rather than a static themed image: progress is represented by live glass tubes, milestones by status lamps, and related data flows can be connected by responsive SVG pipework.

## Current milestone

**PR 2 — Core application architecture**

This milestone adds:

- the canonical dashboard route registry and working routes for every main menu destination;
- reusable route scaffolding for later machine dashboards;
- a PostgreSQL connection layer with lazy initialization;
- a migration directory and bootstrap migration ledger;
- centralized runtime/environment configuration;
- a health endpoint at `/api/health`;
- architecture and configuration documentation;
- tests for routes, environment behavior, and application health.

The branch shows the target post-merge self-tracking state for Engine Room as **2 / 40 planned PRs**. Later roadmap work replaces this temporary seeded progress with live GitHub-derived state.

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

See [docs/development-plan.md](docs/development-plan.md) for the roadmap and [docs/architecture.md](docs/architecture.md) for architecture boundaries.
