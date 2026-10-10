# Project comparison — compact workspace

The Projects page compares registered projects in **four** columns: project (with GitHub link), lifecycle stage, merged / all planned work (with remaining/open details), and one unified semantic progress bar.

The shared search/lifecycle/sort controls filter the table without altering plan totals. Avoid a second status-tile bank or extra permanent columns that make scanning unnecessarily difficult.

**Progress colors:** green = merged, yellow = written/open/unmerged (irrespective of CI), empty = not started/unverified. A newly added planned item increases the total denominator just like an original item; it is not a separate yellow category. Percentage reflects merged work only. For 100 planned, 60 merged, 10 open, the bar is 60% green, 10% yellow, 30% empty.

Projects without documented development plans show N/A instead of a fabricated 0% bar. Empty and filtered-out states are distinct. The semantic table stays in a keyboard-focusable horizontal scrolling region on narrow screens; the entire page must not overflow.

The page uses the same source-backed `summarizePlannedProgress` and `PlannedProgressTube` as the main portfolio and project detail pages.
