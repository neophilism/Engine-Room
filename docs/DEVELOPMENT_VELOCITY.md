# Development velocity history and Boardroom rollout comparison

## Source of truth
The development velocity section is reconstructed from GitHub PR merge timestamps already persisted in Engine Room's PostgreSQL github_pull_requests table. It is **not** a source of roadmap plan completion, operational acceptance or code quality. One PR with a non-null merged_at is counted once per tracked primary repository, regardless of how many commits it contains. Projects without any PR merges remain visible.

The dashboard uses one small grouped history query (up to the last 365 UTC days), one sync-freshness query and one rollout-marker query. It does **not** fetch GitHub or initiate background collection. The owner's existing Manual / Automatic refresh selector retains its behavior. Pressing Refresh manually updates GitHub then re-renders the graph. Automatic refresh remains opt-in.

## Charts and rates
- The rate graph counts merged PRs per UTC day (14- and 30-day windows), or per 7-day bucket (90- and 365-day windows).
- The cumulative graph counts merges inside the selected date range, not all-time PRs.
- Last seven, previous seven and last 28 use completed UTC days only, excluding the incomplete current day.
- The project table shows all registered primary projects, seven-day rate comparison and a 28-day mini-chart, with search and graph selection.
- Source recency is shown using the oldest/latest successful per-repository checkpoint. A stale or unsynchronized project is never presented as live.

## Boardroom comparison
The comparison date is entered by an administrator when Boardroom begins *affecting the development workflow*. It is not inferred from the Boardroom repo creation or its deploy date. Date updates and removals are recorded in an audit table in migration 0022. The write endpoint requires admin authentication and trusted origin. The date is interpreted as a UTC calendar date.

Once seven full days *after* activation have elapsed, the dashboard compares the seven full days immediately before launch with the seven immediately after launch, excluding the activation day itself. This is a matched-window comparison. The portfolio-wide rollout comparison excludes Boardroom's own development PRs, because building Boardroom should not count as a productivity benefit it delivers to the other projects. A separate pre-active project cohort (projects with merges before the date) helps distinguish new project launches from changes to existing project throughput.

If the pre-activation count is zero, no percentage/multiplier is invented. If fewer than seven post-launch days have elapsed, the dashboard shows that the comparison is not yet ready. Dates beyond the retained 365-day history cannot produce a reliable matched comparison.

## Interpretation
PRs per day/week show integration throughput. They do not measure the size or complexity of changes, quality, labor hours, releases, accepted roadmap units, or causal impact. Splitting one feature across more PRs can raise this number without increasing delivered development. Cross-check with the project completion and testing readouts before concluding that Boardroom produced an increase.

Tested: UTC date arithmetic, project/no-PR handling, day/week bucket aggregation, matched comparison windows, exclusion of Boardroom's own PRs and chart controls. Run full CI before merging; Render applies migration 0022 during deployment.
