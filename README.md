# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

The interface is intentionally built as a functional Victorian steampunk machine rather than a static themed image: progress is represented by live glass tubes, milestones by status lamps, and related data flows can be connected by responsive SVG pipework.

## Current milestone

**PR 1 — Repository foundation**

This milestone establishes:

- Next.js + React + strict TypeScript;
- linting, type checking, tests, and production-build CI;
- the first responsive Engine Room shell;
- the initial machine-inspired visual language;
- Engine Room itself as the first portfolio project at **0 / 40 planned PRs**;
- the approved 40-PR development plan;
- `.exechub/project.yml` as the machine-readable self-tracking manifest.

## Development

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

See [docs/development-plan.md](docs/development-plan.md) for the full roadmap.
