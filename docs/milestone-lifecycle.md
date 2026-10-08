# Milestone completion and lifecycle state

PR 15 derives milestone and project development state from the approved roadmap.

## Milestone state

For the planned PRs assigned to a milestone:

- every PR merged -> `complete`;
- explicit blocker present and work remains -> `blocked`;
- any PR merged or in progress -> `active`;
- otherwise -> `planned`.

The calculation also exposes completed/planned counts and a one-decimal completion percentage. A membership mismatch against the approved milestone count is an error rather than a silently adjusted denominator.

## Project lifecycle

Development-state inference is intentionally conservative:

- all milestones planned -> `planned`;
- any milestone active, complete, or blocked while work remains -> `active-development`;
- every milestone complete -> `complete`.

Operational/administrative states (`beta`, `live`, `maintenance`, `paused`, `archived`) are explicit decisions and are never overwritten by roadmap inference.
