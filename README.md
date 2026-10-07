# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

The interface is built as a functional Victorian steampunk machine rather than a static themed image: progress is represented by live glass tubes, milestones by status lamps, and related data flows can be connected by responsive SVG pipework.

## Current milestone

**PR 5 — Machine design system**

This milestone establishes the visual/material grammar used by all later dashboard components:

- coal/cast-iron, aged brass, copper, patina, teal illumination, and semantic status palettes;
- responsive glass, brass, cast-iron, patina, and backdrop material tokens;
- display/body/instrument typography roles;
- spacing, geometry, pipe thickness, lamp size, focus, depth, glow, and motion tokens;
- canonical machine states for neutral/live/active/complete/warning/blocked/offline;
- accessible focus and selection styling;
- migration of the existing shell and portfolio controls onto the token system.

The branch shows the target post-merge self-tracking state for Engine Room as **5 / 40 planned PRs = 12.5%**.

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

See `docs/design-system.md` for the machine visual grammar and `docs/development-plan.md` for the complete roadmap.
