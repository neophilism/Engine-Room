# Current interface policy — compact workspace

**Owner direction, October 10, 2026:** prioritize a clear, compact and readable software portfolio over the original steampunk machinery. The original art direction is **deferred, not discarded**; a future iteration may add optional, flexible machine graphics without replacing the underlying data-driven experience.

## Current production presentation

- `app/workspace.css` is intentionally imported **after** the previous tokens, global styles, machine components and progress CSS. It is the current UI skin. Do not remove or reorder it without designing an equivalent replacement.
- The common application shell uses a compact left navigation, practical route title, working global search, GitHub source-state indicator, Alerts and Account links. Animation pause controls and decorative CONTROL BUS readouts are removed.
- `/` shows concise real portfolio totals and the searchable, filterable project-progress list immediately. An optional **Activity and connected services** section contains open-PR monitoring, deployment details, GitHub status and individual platform metrics.
- `/projects` presents four scan-friendly columns: project, stage, completed/total (plus remaining), and an accessible measured progress bar. The old four lifecycle status cards and always-one repositories column were redundant; lifecycle filtering remains in the select field.
- Do not reintroduce `MachinePreview`, the machine-animation test page/footer, demo values, the decorative roadmap signal-path diagram, or standalone motion controls on user-facing pages.
- Keep source-backed counts and documented unmapped/incomplete work truthful. A documented plan at 0% **must** have a real bar; a missing plan is N/A. Do not equate merged PR totals with the number of completed original plan units without evidence.
- Keep congressional podcast-production inquiries prominently red when present. Warning/error colors have explicit operational meaning. All other status and navigation uses restrained dark slate surfaces and low-contrast boundaries.

## Usability and accessibility

The canonical controls are native form fields, links, buttons, data tables and disclosure elements. Keep keyboard navigation, search focus shortcuts, visible focus states, WCAG-aware contrast, descriptive statuses, semantic `progressbar` counts and responsive layouts. The `/projects` table may scroll within its own region on small screens; the page itself should not overflow horizontally.

## Preserving the deferred theme

Original steampunk design tokens, component primitives and reference documentation remain in the repository for eventual modular theming. Their existence does **not** mean the public website should display mechanical demo widgets. Keep presentational effects decoupled from operational state, source APIs, database schema and progress calculations; introduce future graphical themes only as opt-in, flexible components with `prefers-reduced-motion` support and no disruption to the default compact layout.

## Handoff/verification

Changes in [the October 10 UI PR](https://github.com/neophilism/Engine-Room/pull/77) are tested by `app/page.test.tsx`, `components/app-shell.test.tsx`, `components/projects/project-comparison.test.tsx`, and `tests/browser/workspace-layout.spec.ts`. A code merge does not prove the production browser shows the updated presentation; confirm deployed commit, current page structure and mobile responsive behavior separately.

## Unified roadmap bar semantics (October 10 owner directive)

All original and later planned work shares one denominator. Green means merged;
yellow means written/open but **not yet merged** (drafts, CI-running,
CI-failing, or CI-passing but unmerged); the remainder of the bar is empty.
The color never means "later-added work". As soon as a new batch of plan work
is approved and imported, the denominator grows and the already merged green
portion shrinks proportionally. Example: 60 merged + 10 open + 30 not started
out of 100 = **60% green, 10% yellow, 30% empty**. The tooltip and accessible
value must announce the three numbers. Refer to
[portfolio-progress.md](portfolio-progress.md) for the source-of-truth model.
