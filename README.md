# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

The interface is built as a functional Victorian steampunk machine rather than a static themed image.

## Current milestone

**PR 6 — Mechanical component library**

This milestone adds reusable `BrassPanel`, `GlassTube`, `IndicatorLamp`, `Gauge`, `Valve`, and `Pipe` components, plus accessibility semantics and component tests. The portfolio homepage now uses the real brass housing, glass progress tubes, and status lamp instead of provisional markup.

Target post-merge progress: **6 / 40 planned PRs = 15%**.

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

See `docs/mechanical-components.md`, `docs/design-system.md`, and `docs/development-plan.md`.
