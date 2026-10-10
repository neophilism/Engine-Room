# Portfolio progress — current green/yellow/empty semantics

**Current requirement (October 10, 2026):** a project has **one total planned-work denominator**. It includes all original plan items and all newly documented approved additions. The date a work item was first planned never determines its color.

For a plan containing `N` current work units:

- **Green** = units accepted through a recorded GitHub PR merge timestamp. Merge to an intermediate branch is still a merge, but not proof of production release.
- **Yellow** = written GitHub PRs still open/unmerged, **including drafts, CI-pending, CI-failing, and checks-passed-awaiting-merge**. Yellow is not used for newly planned work that is already merged.
- **Empty** = items neither counted merged nor represented by current open PRs. Planned items not yet created or not verified remain in the denominator.

The bar's accessible value measures `merged/N`; its accessible text also announces `open` and `not started`.

**Required example:** 100 work units, 60 merged, 10 written but open and 30 not started = **60% green, 10% yellow, 30% empty**. An original 50/50 plan is fully green; adding 50 new planned items instantly changes the denominator to 100 and the bar to **50% green, 0% yellow, 50% empty** until those new PRs are opened or merged.

Plan progress percentage = `100 × merged / total planned`. Do not average project percentages or divide by the number of observed, created, synchronized, mapped or opened GitHub PRs. All planned items count in the denominator. The yellow count is capped to remaining plan capacity to avoid overlap and overfilling. PRs that are closed without merging are not accepted and should not count green.

## Evidence sources and fallback

The source-controlled canonical plan plus approved-version data form the denominator. The loader retains source-plan historical provenance (`original`, `addition`) for audit, but **the UI never uses those fields as colors**. If the authoritative plan expands while the older approved plan table has not been reconciled, use the larger documented scope rather than truncating added planned work.

Written, unmerged progress uses mapped `in-progress` plan items and the repository's observed open-PR counts, choosing the larger verified observation rather than summing potentially overlapping counts, and never exceeding `N - merged`. A recent PR merge may remain yellow until GitHub synchronization or signed webhook reconciliation records it; the dashboard must show source freshness and must not guess a merge.

Projects without any documented plan display **N/A** (not 0%); projects with a plan and zero verified merges display a real 0% green bar, with yellow open work as available.

## Scope

These rules apply to the home project list, `/projects`, `/projects/[slug]`, milestones and any aggregate portfolio progress widget. Keep a common `PlannedProgressTube` component and `summarizePlannedProgress` calculation to avoid cross-page disagreements. The old split-color original/added bar was explicitly superseded on October 10, 2026.

A merged PR is not necessarily reviewed for release inclusion, deployed, operationally healthy or accepted by an external stakeholder. Those states remain separate from the current **merged = green** definition.
