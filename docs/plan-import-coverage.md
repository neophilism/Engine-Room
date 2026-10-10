# Why portfolio development plans were missing (2026-10-10)

Engine Room discovers repositories separately from importing verified development plans. Repository presence and GitHub PR activity do not, by themselves, establish a valid planned-work denominator.

## Source cases

- **Music Video Wizard**: approved `.exechub/project.yml` (63 planned units) and `.exechub/approved-pr-mapping.json` (nonconsecutive explicit GitHub PR numbers). The old discovery paths ignored both. The importer now reads the approved manifest and binds only PR numbers from the exact mapping file.
- **End To End Everywhere Suite**: 40-unit approved Exechub manifest and explicit 40-PR mapping. The old discovery paths ignored both.
- **Stems White Label**: approved 30-unit Exechub manifest and `docs/APPROVED-ROADMAP.md`, but **no explicit Exechub PR mapping file** yet. The new importer can report the approved denominator, but must not infer completion from arbitrary GitHub PR numbers. Add the reviewed mapping in the source repository.
- **FOIA Aggregator**: approved 10-unit Exechub manifest, but no exact per-unit PR mapping yet. The new importer can report the planned total, but cannot certify item completion.
- **Distributed Radio Engine**: `docs/roadmap.json` contains DRE-named units without explicit `github_prs`; merged GitHub PR titles use `DRE-XX:`. The importer now matches only unique, exact roadmap IDs from those titles.
- **Music Operations Engine**: `docs/roadmap.json` declares 16 milestones using `milestones`, not `items`. The importer now recognizes this schema and counts a unit complete only when `implementationStatus: implemented` and every explicit PR reference is verified merged. Partial milestones remain incomplete.
- **TrackZero**: a 26-unit documented plan exists; its first merged GitHub PR publishes the planning documents, not a completed TrackZero implementation package. The uncompleted implementation units properly remain in the denominator.

## Projects without a source-controlled plan

At the time of this check the following listed repositories had no recognized approved unit-by-unit plan in their Git trees: Civic Registry Transparency Engine, Smart Cities Surveillance Registry, End To End Everywhere Security Architecture Standard, FOIA Bias Analysis, Live Competition Engine, RAM Marketplace, Secure Intake Case Workflow Engine, Unsealed Records Command Center, and Send FOIA Log Requests. **MMS** and **Rap Battle Platform** were empty Git repositories. Do not invent a 100% denominator from observed GitHub PRs; provide a detailed, reviewed development plan and explicit evidence mapping in the source repository.

## Production prerequisites

Merging this importer fix **does not immediately update the deployed dashboard**. The correct Engine Room commit must deploy on the authorized Render service, database schema must be migrated, and per-repository reconciliation must fetch the committed plan files and PR records. Verify source freshness and errors; do not use any unrelated Render workspace.

## Definition

Planned progress = verified complete planned items / all documented planned items, **not** merged GitHub PRs / observed GitHub PRs. Uncreated and unmapped planned items stay in the denominator. New planned units must be documented and versioned; GitHub activity is merely evidence that can be mapped to those units.
