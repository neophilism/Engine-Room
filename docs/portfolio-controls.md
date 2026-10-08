# Portfolio controls and refresh

Search combines all whitespace-separated terms across project names, summaries, and repository coordinates. Lifecycle filters and deterministic numeric/name sorts do not change the portfolio-wide denominator or statistics. Default portfolio order keeps Engine Room first. Clear filters restores the default view.

Activity labels describe mapped roadmap PRs underway; they do not imply a recent commit or production health. GitHub links are constructed from validated repository coordinates and open with safe external-link attributes.

The visible page refreshes the server snapshot every 30 seconds and when a hidden tab becomes visible. A manual refresh is also available. Background tabs stop refreshing, transitions prevent overlapping requests, and component unmount removes timers/listeners. Router refresh preserves the current search/filter and drawer state. Update latency also depends on GitHub ingestion/reconciliation.
