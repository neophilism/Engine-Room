# Portfolio progress

The Total Portfolio Progress machine sums merged approved roadmap PRs and divides by the sum of each project's approved planned PR total. It does not average percentages or add repository totals to project totals. Underway and remaining counts use the same project snapshot.

An empty portfolio remains neutral with no misleading completion instrument. A fully merged roadmap signals roadmap completion; it does not establish production readiness. The home page renders dynamically so deployments do not freeze portfolio data at build time.

The shared calculation lives in the domain layer and is reusable by client views. Instruments inherit the existing reduced-motion and pause behavior.

## October 2026 correction: full planned denominator

**Never divide completed work by GitHub PRs observed, opened, closed, or mapped.** A plan with 100 planned units, nine verified completed units, one in-progress PR, and 90 items without a PR must display **9/100 = 9%**, not 9/10 = 90%. A missing PR mapping or uncreated PR remains an uncompleted planned item and is never subtracted from the denominator. Projects without any documented plan still display N/A.

The plan progress tube uses green for verified original-plan completions and amber for verified additions explicitly present in imported development-plan documents. Both are divided by **all planned units, original plus added**. For example, 40/40 original plus 9/60 added displays 49/100 = 49% overall. Raw GitHub activity and CI observations may be shown separately for operational diagnosis, but are not progress measures. The original-plan count is preserved and has not been inflated by additional unrelated pull requests.

Project and repository views only show a per-repository completion bar when the repository allocation covers all approved original plan units. If 90 items are unallocated, the project-wide 9/100 tube is shown instead of a misleading per-repository 9/10 tube.
