# Responsive machine layout and pipe routing

PR 7 introduces composition primitives for turning individual machine controls into connected mechanisms.

## MachineFlow
Sequential processes render horizontally on wide screens and reroute vertically on narrower layouts without viewport JavaScript. Typical uses include build-to-production, alert-to-resolution, and approved-plan-to-progress flows.

## FlowStation
A compact chamber for one stage in a flow, with engraved eyebrow, title, detail text, and optional child controls.

## MachineManifold
Multiple logical streams fan into a collector and one output. This is intended for real relationships such as cost categories into total spend, source health into operational health, or alert sources into triage.

## MachineGrid
Responsive banks for KPIs, gauges, and controls. Three/four-column banks collapse to two columns and then one on phones.

## Rule
Pipes are used when a relationship exists, not as generic ornament. Structural connectors remain hidden from accessibility APIs.

The portfolio overview now exercises the system with a real roadmap signal path:
Approved Plan → Planned PRs → Merge Events → Machine State.

PR 8 adds motion and state transitions on top of this layout system; see `machine-animation.md` for state inheritance, pause controls, and reduced-motion behavior.

