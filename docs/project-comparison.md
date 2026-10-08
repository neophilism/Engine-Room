# Project comparison

The Projects page compares every registered project using approved planned PRs, merged/underway/remaining work, repository count, and explicit lifecycle stage. Shared portfolio controls search/filter/sort the rows without altering the underlying plan totals.

Projects without an approved plan display **No approved plan / Not measured** instead of a fabricated progress bar. Data failures, empty portfolios, and no filter matches have different messages. A semantic table with row/column headers sits in a keyboard-focusable scroll region on narrow screens; it does not force the whole page to overflow.

The page loads current database data on each request and reuses the visible-tab refresh controls. Features, risks, and broader GitHub activity are added by their subsequent intelligence milestones.
