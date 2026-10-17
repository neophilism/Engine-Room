# Planned-PR completion and acceptance lifecycle

## Definitions (October 10, 2026)

**Planned unit:** a work unit in the current development plan, including *both* original milestones and later formally documented additions. Provenance is retained for handoff and audit but does not change visual status.

**Green / full-scope complete:** a planned unit is complete when its specified scope is fulfilled and all required mapped PRs are merged. Merged *contributing* PRs are also accepted PRs but do not alone complete a larger work package. Completed CI checks alone do not satisfy this requirement. A merge to an intermediate branch counts as merged planned work; production release is separately monitored.

**Yellow / scope underway:** package scope with accepted merged or open contributing PRs where the whole package remains unfinished. Open-PR counts are reconciled from GitHub, not invented. If open PRs cannot be mapped individually, display their verified observed count bounded to the number of unmerged planned units. Never sum duplicate graph and activity observations.

**Empty / not started:** plan work with neither verified completion nor mapped contributing PR work. Missing mappings remain unmerged. A closed-without-merge PR does not count green or yellow.

## Total denominator

Use the *current complete approved plan scope*, not only its original version. New approved work adds to the same denominator, and a previously full progress bar **must shrink** when the new plan is larger. Historical approved plan versions and their source fingerprints remain immutable so prior scope can be audited. Changes in the current scope are a legitimate cause for the current completion percentage to change.

Do not derive a plan denominator solely from GitHub PRs observed/opened/mapped. A 100-unit plan with 60 merges, 10 open PRs and 30 unstarted units is **60 green + 10 yellow + 30 empty**. The number of remaining unmerged units is 40.

GitHub PR numbers are repository-local. A work unit may have multiple PR mappings; avoid double-counting it within the *mapped planned-item completion* measure. In cases where raw open-PR counts are used because mapping is incomplete, clearly distinguish the evidence from fully mapped work. Merged PRs and deployed releases are different states.

## Owner clarification — 17 October 2026

Every real merged GitHub PR is **accepted as a PR** immediately at merge, regardless of larger planned work-package status. GitHub `merged_at` is the source of truth; there is no second acceptance process for a PR.

The planned-work bar represents **full-scope completed work packages**. A package can still need further work even when many of its contributing PRs are accepted. Green is full-scope complete; yellow is remaining scope with accepted/open contributions; empty has no verified progress. The separate accepted-PR count must never be replaced with the number of completed packages. Do not divide the raw number of merged PRs by the number of planned packages; the mappings are many-to-many.

A merged PR does not prove deployment or production authorization. Those are reported separately. A bundled historical snapshot is never a replacement for fresh live GitHub observations.
