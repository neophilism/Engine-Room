# Engine Room

Engine Room is a responsive executive software-portfolio control room for tracking projects from an approved development plan through active development, deployment, operations, finance, usage, and lifecycle management.

## Current milestone

**PR 7 — Responsive machine layout and pipe routing**

This milestone adds responsive `MachineFlow`, `FlowStation`, `MachineManifold`, and `MachineGrid` composition primitives. Sequential machinery reroutes from horizontal desktop layouts to vertical tablet/mobile layouts without JavaScript viewport branching, and logical multi-source flows can merge into a single output.

The portfolio homepage now includes a live roadmap data path that visibly connects the development-plan logic to machine state.

Target post-merge progress: **7 / 40 planned PRs = 17.5%**.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

See `docs/machine-layout.md` and `docs/development-plan.md`.
