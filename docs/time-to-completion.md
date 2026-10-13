# Dual progress: roadmap work versus elapsed project time

## Product contract

Every existing accepted-work progress bar retains its original unit (approved work packages/PRs) and its exact GitHub-sourced green/yellow/unstarted semantics. Beneath it appears a **distinct blue time-progress bar**, measuring elapsed calendar time as a share of the latest projected total project duration. They are deliberately not the same measure or interchangeable.

Each time bar displays two estimates and their forecast dates:
1. **Calendar pace (primary, time-bar denominator)**: expected calendar time remaining, including idle time, staffing limits, blockers and slow integrations. This is usually the more immediately practical forecast.
2. **PR-cycle pace (secondary, potential throughput)**: projected time from measured accepted PR creation-to-merge lifecycles and observed simultaneous PR lanes. This is not a guaranteed no-blocker schedule, nor a measurement of agent logins. It illustrates delivery capacity under sustained historical parallelism.

All forecasts use **accepted approved plan units**, not unlinked GitHub PRs, partial contribution PRs, CI successes or deployments. For units linked to multiple PRs, the acceptance timestamp is the last required merged PR and cycle time starts with the earliest linked PR.

## Derivation and clocks

Let `N` be all approved plan units (including later additions), `C` be accepted units, `R=N-C` and `E` elapsed calendar days from the earliest source-verified GitHub repository creation date. If repository creation metadata has not been synchronized, use the earliest recorded GitHub PR creation timestamp. Never substitute initial Engine Room registration or last refresh time for project inception. The UI discloses which proxy was used; actual historical project inception may differ.

The lifetime pace `L=E/C` days per accepted unit. With at least three accepted-unit completion timestamps, calculate a recent pace `V` from the newest up-to-six completions: `V=(now - earliest timestamp in window)/(window size - 1)`, with a one-hour per-unit floor. Blend `L` and `V` with recent weight `min(0.7,0.14*(window size-1))`, otherwise use lifetime pace. This makes the calendar estimate sensitive to improved throughput or prolonged gaps instead of mechanically duplicating `C/N`.

Calendar days remaining = `R * blended days per unit`.
**Time-bar percentage** = `100 * E / (E + calendar days remaining)`. The future target date is the observation timestamp plus remaining days. The two progress bars may move differently, and the time bar may regress when new work is approved or delivery slows.

PR-cycle pace uses the **median** valid creation-to-merge duration of up to 12 latest accepted units. Estimate concurrent lanes from the maximum observed overlap among those PR lifecycles (at least 1); PR-cycle remaining time is `R * median cycle days / observed lanes`. Overlap is an observed proxy, **not** a promise of future agent capacity, and lifecycle intervals may include blockers and waiting.

Project rows reuse the source plan's verified mapped units and dates. Multi-repository rows scope histories and project start dates to each repository (never borrow another repository's progress). Milestones, where backed by the legacy approved-plan graph, measure time from their first observed linked PR. The portfolio aggregate uses the earliest source start and the **latest** unfinished project forecast, since parallel project dates must not be summed.

## Refresh, missing evidence and safety

The estimator is a pure function evaluated from the latest database snapshot each time the server renders. GitHub webhooks/reconciliation advance database revision, the live connection refreshes changed screens, and visible dashboards refresh every 30 seconds. Refreshing a screen recalculates elapsed time and both forecasts using the new observation timestamp. Neither the source plan nor historical GitHub events is rewritten to make an ETA shorter.

No accepted work, no reliable start, bad timestamps or missing merge evidence produce **unavailable**, not a fabricated deadline or a 0%-elapsed time bar. A fully accepted plan shows 100% with zero remaining, without claiming release or security acceptance. Invalid totals, future events and unrealistic projection horizons are rejected. Display the latest GitHub source synchronization timestamp (or unverified), sample size and observed parallel PR lanes.

Forecasts do not yet include independent estimates for future complexity, planned pauses, unlogged contributors or promised future staffing. They extrapolate historical accepted work. As additional projects, agents and recorded merge histories arrive, they adjust with the next GitHub sync. Future optional improvements: source-authored project inception timestamps, measured agent working sessions, credible ETA bands, per-work-unit relative complexity and critical-path modeling; none should be silently assumed.

## Acceptance evidence

- Domain unit tests: acceleration, idle gaps, new scope, parallel PRs, zero or corrupt evidence, completed projects and max-duration portfolio aggregation.
- Component tests: separate accessible bars, distinct units and an honest missing-evidence state.
- PostgreSQL integration: authentic repository creation, approved GitHub PR timestamp joins, project/repository/milestone projections.
- CI: run typecheck, lint, migrations, roadmap validation, unit/integration suite, Next build and Playwright tests on the exact PR head.
- Before production claim: merge under repository rules, verify deployment/release SHA on the authorized Render service, live GitHub/Neon sync timestamps, actual dashboard content and operational access. A successful merge is not a production release.
