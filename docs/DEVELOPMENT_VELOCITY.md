# Development velocity history and Boardroom rollout comparison

## Source of truth
The development velocity section is reconstructed from GitHub PR merge timestamps already persisted in Engine Room's PostgreSQL github_pull_requests table. It is **not** a source of roadmap plan completion, operational acceptance or code quality. One PR with a non-null merged_at is counted once per tracked primary repository, regardless of how many commits it contains. Projects without any PR merges remain visible.

The dashboard uses one grouped history query (up to the last 365 UTC days) with an all-time merged-PR aggregate in the **same** SQL statement, one sync-freshness query and one rollout-marker query. It does **not** fetch GitHub or initiate background collection. The owner's existing Manual / Automatic refresh selector retains its behavior. Pressing Refresh manually updates GitHub then re-renders the graph. Automatic refresh remains opt-in.

## Charts and rates
- The rate graph counts merged PRs per UTC day (14- and 30-day windows), or per 7-day bucket (90- and 365-day windows).
- The cumulative graph counts merges inside the selected date range, not all-time PRs.
- Last seven, previous seven and last 28 use completed UTC days only, excluding the incomplete current day.
- The project table shows all registered primary projects, seven-day rate comparison and a 28-day mini-chart, with search and graph selection.
- Source recency is shown using the oldest/latest successful per-repository checkpoint. A stale or unsynchronized project is never presented as live.

## Lifetime average: merged PRs per day
Every tracked project and the entire portfolio display a persistent **Lifetime PRs/day** value, independently of the selected chart range.

- **Project:** all merged PRs recorded for all of the project's primary repositories, divided by inclusive UTC calendar days since the earliest recorded GitHub repository creation date through today.
- **Portfolio:** the sum of all tracked project merged PR counts divided by one inclusive UTC period since the **oldest** primary GitHub repository's creation date. It is not a sum or unweighted average of per-project rates.
- **Source:** repository metadata field github_created_at (collected from GitHub), with the earliest PR created_at used only if the GitHub repository creation date is missing. Never use the day Engine Room imported a repository.
- **Coverage:** merged PRs from *all stored history*, even if they fall outside the 365-day graph window. This means the lifetime total need not equal the sum of a 365-day chart.
- **Zero vs unknown:** a newly created repo with no merged PRs reports 0.00/day, including its first day. Missing a reliable start date yields N/A, rather than a misleading rate.
- **Precision:** two decimal places in the UI, with merge counts, elapsed calendar days and the start date available for interpretation. Today is a partial calendar day; the lifetime rate includes merges through the most recent manual sync.

GitHub repository creation dates are a transparent proxy for the measurable code project lifespan, **not** proof of when the idea or original development started. Historic dormant repositories reduce the whole-portfolio lifetime rate even when today's activity is fast; compare this rate with the existing completed-week activity and Boardroom benchmark rather than treating the lifetime number as current throughput.

This metric does not introduce polling, another provider, a recurring query, or an additional data-fetch round trip. It reuses the same SQL aggregation as the graph and the existing manual Refresh switch.

## Boardroom comparison
The comparison date is entered by an administrator when Boardroom begins *affecting the development workflow*. It is not inferred from the Boardroom repo creation or its deploy date. Date updates and removals are recorded in an audit table in migration 0022. The write endpoint requires admin authentication and trusted origin. The date is interpreted as a UTC calendar date.

Once seven full days *after* activation have elapsed, the dashboard compares the seven full days immediately before launch with the seven immediately after launch, excluding the activation day itself. This is a matched-window comparison. The portfolio-wide rollout comparison excludes Boardroom's own development PRs, because building Boardroom should not count as a productivity benefit it delivers to the other projects. A separate pre-active project cohort (projects with merges before the date) helps distinguish new project launches from changes to existing project throughput.

If the pre-activation count is zero, no percentage/multiplier is invented. If fewer than seven post-launch days have elapsed, the dashboard shows that the comparison is not yet ready. Dates beyond the retained 365-day history cannot produce a reliable matched comparison.

## Interpretation
PRs per day/week show integration throughput. They do not measure the size or complexity of changes, quality, labor hours, releases, accepted roadmap units, or causal impact. Splitting one feature across more PRs can raise this number without increasing delivered development. Cross-check with the project completion and testing readouts before concluding that Boardroom produced an increase.

Tested: UTC date arithmetic, all-time PR-rate calculations (including missing start dates, zero PRs, distinct project lifetimes and merges outside the chart window), project/no-PR handling, day/week bucket aggregation, matched comparison windows, exclusion of Boardroom's own PRs and chart controls. Run full CI before merging; Render applies migration 0022 during deployment.
