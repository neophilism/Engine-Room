# Engine Room accuracy recovery: diagnosis and PR delivery plan

Owner request: 18 October 2026. Status: implementation written as the ER-056–ER-063 chain. See `ACCURACY_VERIFICATION.md` and the actual PR/CI observations for validation and rollout status; production acceptance is not inferred from this document.

## Verified incident and immediate answer

The Galinsky 2028 GitHub Pull Requests API, read across both pages, returns **120 PRs: 4 open and 116 closed**. Of the closed PRs, **111 are merged and 5 were closed without merge**. Engine Room's production PostgreSQL records independently return exactly those same five counts; latest stored observation in this audit: **2026-10-18 21:12:12 UTC**. The owner is correct about 4 open / 116 closed. The present incident is not evidence that these particular PR rows were imported incorrectly.

Engine Room emphasizes **8/71 full work packages, 11.3%** instead. That comes from a source-owned planning file, not GitHub's PR counters. Its contribution mappings describe partial work, and its eight completed-package mappings remain the basis of the display even as many more PRs merge. This is an unacceptable primary representation of the facts the owner wants to inspect. It is not a verified estimate that only 11.3% of the application is implemented, nor evidence that 88.7% of development effort remains.

A source registry is simply a JSON planning file checked into a project repository. It must never replace GitHub's actual PR history or require an owner to understand an internal tracking format to interpret the dashboard.

### Evidence captured

| Repository | Total PRs | Open | Closed | Merged | Closed without merge | Current displayed local package count |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Galinsky-2028 | 120 | 4 | 116 | 111 | 5 | 8/71 |
| Secure-Intake-Case-Workflow-Engine | 42 | 0 | 42 | 41 | 1 | 27/42 |
| National-Secure-Ideas-Submission | 27 | 1 | 26 | 25 | 1 | 21/21 |

GitHub source: `/repos/neophilism/Galinsky-2028/pulls?state=all&per_page=100&page=1` and page 2. Database source: grouped `github_pull_requests`, joined to `repositories`. These are observations, not hardcoded future totals.

The connected GitHub inventory contains 56 repositories; 52 are tracked. The four absent names are neurosynth, pupil, hubs and facerec, covered by fork/exclusion policy. The database contains 52 distinct project IDs, 52 repository IDs, no missing primary links and no repositories shared across projects. Of the 52 projects, 51 have PR activity; XLR8 has none. These counts currently reconcile under the existing policy. This does not certify the completeness of any restricted credential's repository visibility or prove that “active” is a useful description of recent work.

## Diagnosed causes

1. **The primary metric answers the wrong question.** `components/portfolio/project-progress-stack.tsx` prominently renders “packages fully complete” and a percentage. Actual GitHub open/closed counters are absent from that summary. `lib/domain/planned-progress.ts` correctly preserves a planning denominator, but the presentation implies an overall completion estimate that the data cannot support. Closing a PR without merging is a real GitHub event, even though it must not count as implemented work.
2. **Planning records can lag implemented code.** Galinsky's canonical plan still has eight completed units and many contribution-only links. Its current code history includes later merged changes through PR #124. Secure Intake's canonical plan contains seven broadly titled SI-28–34 slots with no accepted PR mappings, although GitHub has actual merged storage/scanning/readiness/release PRs #28–34. Those historical numbers are not automatically valid plan mappings: the plan explicitly warns that ADR and PR numbers may differ. “Unmapped” is not proof that code is absent. Source review is needed; neither 11.3% nor 64.3% is a validated product completion estimate.
3. **Upstream relationships are mostly visual nesting, not completion evaluation.** `lib/domain/project-hierarchy.ts` nests National Secure Ideas under Secure Intake. National Secure Ideas' detailed plan specifies upstream capabilities, while every unit in its canonical registry has empty dependency arrays. `engine.lock.json` pins engine `1.0.0-rc.9` at `2fb452f23e5e5464db03a3ec95d36c4bc2db4fa4`. The detailed plan explicitly describes downstream PRs merging just before upstream PRs and later correcting source pins. This establishes historical prerelease co-development; it does not establish a completed engine or production application. Do not claim a recent scheduler caused this older history without run evidence.
4. **Engine Room drops dependency semantics.** The shared parser exposes local and cross-repository dependency IDs and external prerequisites. `persistPlanDocument` persists mappings/contributions but does not preserve those dependency fields as queryable unit records. `loadProjectMonitorData` evaluates mapped PR merges, not prerequisite satisfaction. Thus 21/21 locally mapped units can appear as unconditional 100% completion without upstream or production readiness.
5. **“Merged” and “present in the release” are different facts.** The source plans document earlier stacked PRs merged into feature branches that had already been merged, requiring later main-branch consolidation. Engine Room has release ancestry signals but the local package completion query checks only `merged_at`. Preserve PR acceptance at merge; do not imply release inclusion or live verification from that event.
6. **Freshness panels disagree by definition.** `loadDevelopmentVelocity` counts any non-null historical successful-sync timestamp as “synced.” `GitHubSourceReadout` uses a 25-minute recent threshold. The screenshot therefore simultaneously says 0/52 recent and 52/52 synced. They are measuring different conditions with insufficient labels.
7. **Client status can remain stale after server data changes.** `GitHubSourceReadout` listens to manual-sync completion but not portfolio revision events. HTTP failures leave prior values displayed; the periodic poll is five minutes. Its detail SQL declares a visibility field in TypeScript without selecting `r.visibility`, so private provenance can render incorrectly.
8. **The page has multiple independent observations.** Portfolio, velocity and client health use different reads/times. A repeatable-read transaction protects the portfolio loader internally but not the whole page. There is no common displayed observation ID tying the panels together.
9. **“Refresh all” cannot be inferred from attempted work alone.** Reconciliation has a 100-repository selection limit and skips leased repositories; optional metadata failures have separate meaning. Full coverage needs explicit requested/attempted/completed/deferred/failed evidence, especially as the portfolio grows. Discovery of visible public repositories cannot certify inaccessible private inventory.

## Product and counting contract

The primary project row must show **Open**, **Closed**, **Merged**, and **Closed without merge**, with **Total PRs** available beside them. Galinsky's acceptance fixture is 4 / 116 / 111 / 5 / 120. All values come from one repository-scoped observation. Invariants: `total = open + closed`; `closed = merged + closedWithoutMerge`. Draft PRs are a subset of open, not an extra count. Use immutable GitHub repository and PR identities for storage and joins.

Do not present `closed / total`, `merged / total`, raw PR count, or an equal-weight package fraction as “the app is X% finished.” If a closure-rate visualization is retained, label it explicitly as PR closure rate; it is not development completion. Do not color closed-unmerged work as implemented. Every verified merged PR is accepted immediately; it never awaits another acceptance ceremony.

Planned work remains a distinct, secondary section: total documented packages, linked accepted PRs, contributions, scope evidence, and missing mappings. Preserve approved uncreated work and additions. Label absent mapping as **not reconciled**, not **not implemented**. Show source commit and observation age. Product readiness, deployment and upstream readiness are separate explicit states; no universal “complete” badge without the applicable evidence.

Tracked means distinct registered projects within the selected portfolio, with documented archive/exclusion policy. Active lifecycle and recent activity must be separate definitions. A historical PR can establish that work began; it cannot prove an agent is working now. Show a count breakdown and a project-list drilldown using the exact same selection predicate.

## Implementation sequence

Eight bounded PRs follow. Each PR carries tests and updated operating documentation. Later gates must not prevent independent counter and stale-state repairs from shipping first. Maintain existing authorization, cryptographic controls, branch rules and spending restrictions. No new paid services.

### ER-056 — Make GitHub PR facts the primary project summary

- Add a repository-scoped PR summary with total/open/closed/merged/closed-without-merge/draft counts and observation metadata, derived in one grouped query.
- Preserve existing merged-PR acceptance semantics. Rename/hide the prominent package percentage as a secondary planning view; remove claims of overall software completion from that fraction.
- Render all four requested facts in project rows, detail pages and comparison views, with links to equivalent GitHub filters. Include zero-PR projects.
- Define count labels and invariants centrally; remove duplicate ad hoc counter formulas.
- Tests: Galinsky 120/4/116/111/5, closed-but-unmerged, draft, reopened PR, empty repository and same PR number in different repositories. Browser test asserts the owner sees 4 open and 116 closed without expanding a planning drawer.
- Acceptance: displayed GitHub facts match a complete paginated live observation and persisted rows; no hardcoded totals and no unsupported overall completion percentage.
- Dependencies: none. Main files: `lib/domain/live-monitor.ts`, `lib/server/live-monitor.ts`, portfolio/project summary components and their tests.

### ER-057 — Establish auditable project inventory and lifecycle counts

- Reconcile discovered repository IDs, tracked project IDs, primary links, archived projects, forks, exclusions and inaccessible repositories. Preserve history; do not delete projects because a credential cannot see them.
- Prevent discovery slug collisions from silently giving two unrelated repositories the same primary project. Diagnose existing ambiguities before any repair; do not silently deduplicate conflicting records.
- Use one inventory selection for summary counters and their drilldown. Separate registered lifecycle from recent PR/agent activity, with an explicit time window.
- Show discovery scope and last successful inventory observation. A partial private discovery is incomplete coverage, not complete success.
- Tests: multiple repositories in one project, duplicate join rows, repository rename/transfer, archive/unarchive, fork exclusion, permission loss, empty XLR8, paused/completed states and pagination beyond 100 repositories.
- Acceptance: inventory totals and lists reconcile; a selected count opens its exact contributing records. Current 52/51 numbers are neither preserved blindly nor changed to satisfy an expectation.
- Dependencies: none; can ship with ER-056. Main files: discovery/runtime, portfolio queries/statistics and inventory diagnostics.

### ER-058 — Make refresh atomic in presentation and complete in coverage

- Introduce a reconciliation run/observation ID shared by counts, freshness and planning views. Record repository scope, start/end, coverage and per-source outcomes. Reuse/extend the existing reconciliation-run tables rather than add a parallel run system.
- Complete pagination and bounded batches across all registered repositories. Distinguish leased/deferred, inaccessible, rate-limited, failed and completed repositories. Resume a partial refresh without blocking other project work.
- Publish a coherent snapshot only from persisted evidence; do not mix a new counter with an older success claim. Keep the previous complete snapshot labeled historical while a new one runs.
- Preserve core PR refresh when optional check/review/metadata queries fail; expose those failures accurately.
- Tests: >100 repositories, >100 PRs, concurrent webhook/manual updates, reopened/closed changes during a run, lease skips, partial rate limit and process restart.
- Acceptance: Refresh reports exact coverage and observation time; no “all refreshed” after a partial run. Repeating refresh does not duplicate records or counters.
- Dependencies: ER-056 and ER-057.

### ER-059 — Fix stale UI, sync health and source provenance

- Subscribe the status readout to data revisions and manual-sync events; refresh after tab restoration, coalesce concurrent requests and clear current-state claims on HTTP/parse failures.
- Use one documented freshness definition across velocity, health and project summaries, based on server observation time, configured polling policy and a tested clock-skew allowance. Distinguish ever synchronized from synchronized recently.
- Select actual repository visibility and validate provider/database payloads; do not infer “public” from an absent field.
- Display stale/partial/error states and source times beside the affected facts. Keep manual-refresh mode and avoid adding high-frequency polling or LLM work.
- Tests: screenshot's 0-recent/52-historical case; 503 after a previous success; revision while mounted; simultaneous events; unmount; private visibility; invalid/future timestamps; configured public versus authenticated intervals.
- Acceptance: panels agree on freshness for the same snapshot. An API outage cannot leave a stale success badge labeled current.
- Dependencies: can ship initial defect repairs immediately; observation-ID integration follows ER-058.

### ER-060 — Preserve plan scope, dependencies and uncertainty end to end

- Add a backward-compatible migration for stable work-unit identity, local/external dependency edges, prerequisites and source commit/fingerprint. Persist every field already returned by the shared parser. Backfill from source documents, retaining old evidence and versions.
- Distinguish no mapping, partial contribution, mapped PR acceptance, verified full scope and release inclusion. Import errors retain the last good plan as historical and expose the failure.
- Never infer full scope from numerical PR position, approximate titles, a merged contribution or missing mappings. Never reintroduce a second active plan format.
- Add reconciliation diagnostics identifying merged unmapped/contributing PRs and stale scope evidence, making source repair work discoverable.
- Tests: round-trip dependency preservation, unknown upstream unit, malformed/cyclic dependencies, renamed unit protection, unchanged import, stale source, ambiguous mappings and valid expanded plans.
- Acceptance: a cold-start agent and the UI can trace a work item to source, dependencies and actual PR evidence; no silent field loss.
- Dependencies: ER-058. Main files: shared contract, migrations, `plan-import.mjs`, `live-monitor.ts`.

### ER-061 — Separate local work from upstream and production readiness

- Evaluate prerequisite graphs from source-owned requirements, including absent/unknown evidence, transitive prerequisites and cycles. Visual hierarchy is not dependency authority.
- Show local merged PR facts independently from “upstream requirements satisfied,” “included in release,” and “live verified.” National Secure Ideas must not look unconditionally finished merely because all its local mapped packages merged.
- Apply the owner's upstream-first requirement to the governing source plan and eligible downstream implementation/release units. Preserve independently useful planning/testing work and actual historical PR acceptance; do not rewrite history or impose unrelated dependencies on every other project.
- Verify pinned engine commit/version against declared requirements and release evidence. An exact prerelease capability may be documented as such; it must not be mislabeled a completed stable engine.
- Coordinate source contracts with Boardroom's existing dependency eligibility checks; fix any observed consumer gap with matching regression coverage. Do not claim historical scheduling behavior was corrected solely by changing the display.
- Tests: completed local PRs with unfinished upstream; missing source; transitive chain; cycle; engine version drift; upstream regression; merged feature-branch PR not in release; accepted PRs remain accepted.
- Acceptance: a downstream row explains exactly which upstream/release requirement remains unsatisfied and links to it; no unconditional product-complete state from local merges.
- Dependencies: ER-060.

### ER-062 — Repair the three implicated source plans with reviewed evidence

This is a coordinated repair unit with a separate PR in each owning repository; Engine Room must not keep private override copies of another project's plan.

- Galinsky 2028: review current source, all new PRs, current tests and deployment evidence against the actual package acceptance criteria. Update `docs/PR_REGISTER.json` and `registry/prs.json` together. Capture later PR contributions, complete packages only where scope is evidenced, and keep owner inputs/production activation separate. Do not inflate completion to match merged count or perpetuate an obsolete audit. Report actual missing code versus missing configuration versus stale mapping.
- Secure Intake: resolve SI-28–34's grouped scope against ADRs, source and actual PRs; distinguish closed-unmerged #32 from merged consolidation #31. Review #35–38 and #43 without assuming their numbers equal roadmap IDs. Keep stable IDs and denominator unless approved scope evidence justifies an explicit plan amendment. Record exact remaining requirements for stable 1.0.
- National Secure Ideas: encode detailed upstream prerequisites and stable-release requirements in the canonical plan; reconcile the rc.9 pin, current engine and actual production acceptance. Distinguish local scaffolding/tooling from usable end-to-end deployment. Preserve the documented historical co-development explanation.
- Each source PR includes its repository instructions, registry validator and substantive source-specific checks. Engine Room imports the merged source live; Boardroom verifies the same dependencies after reconciliation.
- Acceptance: displayed source facts can be reproduced from those repositories; disagreement is visible as unresolved evidence rather than guessed completion. A detailed audit report states what is actually built and what remains.
- Dependencies: ER-060 and ER-061; GitHub counter repairs do not wait for this larger audit.

### ER-063 — Full accuracy acceptance and production rollout

- Run isolated PostgreSQL migration/integration tests and browser tests in addition to typecheck, lint, unit tests and build. Do not call skipped database tests passing.
- Add a backend-only, on-demand read-only reconciliation report comparing GitHub and Engine Room counts per immutable repository ID, inventory coverage, dependency preservation and UI observation IDs. Treat GitHub permission/rate failures as unknown, not zero.
- Validate every tracked repository; retain exact discrepancies and source-bound evidence. Include the three incident fixtures and zero-PR XLR8.
- Merge only with required exact-commit checks and actual branch rules satisfied. Deploy the tested revision to the existing Engine Room service with a rollback point; verify authenticated rendered counts, refresh outcomes, stale/error behavior and dependency warnings on the live app. No new paid resources or production secret exposure.
- Acceptance: live counters agree with a new complete GitHub observation; each panel identifies its observation; National Secure Ideas cannot imply overall readiness while prerequisites are unfinished; planning percentages cannot masquerade as verified application completion.
- Dependencies: ER-056 through ER-062.

## Delivery order and handoff

Ship factual PR counters and the already diagnosed stale-state repairs first. Then unify refresh/inventory observations, preserve and evaluate dependencies, repair source evidence, and complete the production acceptance run. Failed CI is a repair task, not permission to merge a failing revision; a waiting CI run should not stop independent eligible work.

Every implementation PR records its exact tests, remaining evidence and deployment status. No “fixed,” “complete” or “live verified” claim is permitted based on this plan alone. Existing exploratory local fixes are not included in this planning PR and are not deployed.

## Validation performed during diagnosis

A local Engine Room checkout passed typecheck, lint, migration-file checks, **335 unit/component tests** and production build with exploratory fixes present. **22 PostgreSQL integration tests were skipped because an isolated test database was not configured.** Those exploratory results neither verify this plan's future implementation nor certify production. Live GitHub and read-only production SQL comparisons above establish the reported incident counts. No database rows were changed during diagnosis.


## Implementation PR chain

ER-056 #114 → ER-057 #115 → ER-058 #116 → ER-059 #117 → ER-060 #118 → ER-061 #119 → ER-062 #120 → ER-063 (this final verification/audit PR). The three source repair PRs are Galinsky #126, Secure Intake #44 and National Secure Ideas #28. Chained PRs are retargeted to main after each parent merges.
