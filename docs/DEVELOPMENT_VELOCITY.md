# Development velocity history and Boardroom rollout comparison

## Source of truth
The development velocity section is reconstructed from GitHub PR merge timestamps already persisted in Engine Room's PostgreSQL github_pull_requests table. It is **not** a source of roadmap plan completion, operational acceptance or code quality. One PR with a non-null merged_at is counted once per tracked primary repository, regardless of how many commits it contains. Projects without any PR merges remain visible.

The dashboard uses one grouped history query (up to the last 365 UTC days) with a development-wave merged-PR aggregate in the **same** SQL statement, one sync-freshness query and one rollout-marker query. It does **not** fetch GitHub or initiate background collection. The owner's existing Manual / Automatic refresh selector retains its behavior. Pressing Refresh manually updates GitHub then re-renders the graph. Automatic refresh remains opt-in.

## Charts and rates
- The rate graph counts merged PRs per UTC day (14- and 30-day windows), or per 7-day bucket (90- and 365-day windows).
- The cumulative graph counts merges inside the selected date range, not all-time PRs.
- Last seven, previous seven and last 28 use completed UTC days only, excluding the incomplete current day.
- The project table shows all registered primary projects, seven-day rate comparison and a 28-day mini-chart, with search and graph selection.
- Source recency is shown using the oldest/latest successful per-repository checkpoint. A stale or unsynchronized project is never presented as live.

## Average merged PRs per day during the current development push

The previous lifetime-rate denominator accidentally extended the portfolio back to FOIA repositories created in November 2025. That is not the beginning of the new development push. The average now uses **the first primary repository launched in the current late-September / early-October 2026 wave**. From currently synchronized GitHub creation dates, the earliest such repo is FiresideChat, created **October 5, 2026**.

The anchor is discovered from primary, non-archived repositories with GitHub creation timestamps on or after **September 20, 2026**. That lower bound is *only a search window* for discovering the earliest current-wave repository; it does **not** make September 20 the PR-rate starting date. If an earlier late-September repository is subsequently included in the tracked primary portfolio, the baseline advances to its actual creation day.

- **Portfolio rate:** merged PRs across all tracked primary repositories *from the launch calendar day onward*, divided by inclusive UTC calendar days from that earliest newly created repo until today. This is not the average of individual project rates.
- **New project rate:** merged PRs from that project's creation (within the current wave) divided by inclusive UTC calendar days from its creation until today.
- **Legacy project rate:** for repos created before the wave, count *only* merged PRs from the launch date onward and divide by days from that date. Their November 2025 PRs and dormant months do not enter the current-wave metric.
- **Source:** GitHub repository metadata `github_created_at`, with first PR `created_at` as a fallback only when a repo creation date is unavailable. Import timestamps are not project start dates.
- **Zero vs unknown:** a new repository with no merged PRs shows 0.00/day; an unverified launch date or missing necessary repository start date shows N/A.
- **Coverage:** every persisted merge since the development-wave cutoff is counted, including as the calendar moves beyond the graph's separate 365-day history display. The chart itself remains historical and is not cut off retroactively.
- **Precision and transparency:** two decimal places, underlying merge count, inclusive calendar day count, and actual effective rate start date are displayed. The present day is partial and the rate reflects only the last successful manual sync.

The implementation derives the launch day and filters merge timestamps inside the existing grouped SQL query. It adds no cron jobs, third-party data sources, GitHub calls, database migrations or other polling. The Manual / Automatic switch remains unchanged.

## Boardroom comparison
The comparison date is entered by an administrator when Boardroom begins *affecting the development workflow*. It is not inferred from the Boardroom repo creation or its deploy date. Date updates and removals are recorded in an audit table in migration 0022. The write endpoint requires admin authentication and trusted origin. The date is interpreted as a UTC calendar date.

Once seven full days *after* activation have elapsed, the dashboard compares the seven full days immediately before launch with the seven immediately after launch, excluding the activation day itself. This is a matched-window comparison. The portfolio-wide rollout comparison excludes Boardroom's own development PRs, because building Boardroom should not count as a productivity benefit it delivers to the other projects. A separate pre-active project cohort (projects with merges before the date) helps distinguish new project launches from changes to existing project throughput.

If the pre-activation count is zero, no percentage/multiplier is invented. If fewer than seven post-launch days have elapsed, the dashboard shows that the comparison is not yet ready. Dates beyond the retained 365-day history cannot produce a reliable matched comparison.

## Interpretation
PRs per day/week show integration throughput. They do not measure the size or complexity of changes, quality, labor hours, releases, accepted roadmap units, or causal impact. Splitting one feature across more PRs can raise this number without increasing delivered development. Cross-check with the project completion and testing readouts before concluding that Boardroom produced an increase.

Tested: UTC date arithmetic, development-wave PR/day calculations (including older repository cutoff dates, no double-counting of daily rows, missing start dates, zero PRs and distinct project lifetimes), project/no-PR handling, day/week bucket aggregation, matched comparison windows, exclusion of Boardroom's own PRs and chart controls. Run full CI before merging; Render applies migration 0022 during deployment.
