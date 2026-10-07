# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

The interface is intentionally built as a functional Victorian steampunk machine rather than a static themed image: progress is represented by live glass tubes, milestones by status lamps, and related data flows can be connected by responsive SVG pipework.

## Current milestone

**PR 4 — Global responsive shell**

This milestone turns the route set into one coherent responsive application:

- persistent desktop sidebar with active-route machine lamps;
- sticky global top control bar;
- compact tablet instrument rail;
- smartphone off-canvas navigation drawer;
- mobile-safe portfolio progress rows;
- accessible active-route, drawer, search, notification, and account controls;
- shared shell coverage for every current dashboard route.

The branch shows the target post-merge self-tracking state for Engine Room as **4 / 40 planned PRs = 10%**.

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

See [docs/development-plan.md](docs/development-plan.md), [docs/architecture.md](docs/architecture.md), [docs/domain-model.md](docs/domain-model.md), and [docs/responsive-shell.md](docs/responsive-shell.md).
