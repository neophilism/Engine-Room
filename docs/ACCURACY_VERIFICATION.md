# Accuracy verification and rollout

The recovery work is ER-056–ER-063. The readiness endpoint now checks the current migration inventory and reports the actual applied schema, replacing its hardcoded 0017 label. Actual GitHub PR counters are primary; planning mappings, prerequisite readiness and deployment evidence remain independent facts.

## Executable acceptance

- `npm run check`: typecheck, lint, migration discovery, unit/component tests and production build.
- CI additionally provides isolated PostgreSQL 16 for **24 integration scenarios**, including the 120/4/116/111/5 incident and real source-dependency persistence/release resolution.
- `npm run test:browser`: authenticated browser journeys, responsive layout, progress geometry, live events and the new desktop/mobile PR-counter regression. Fixture setup refuses a non-local database URL.
- The API authentication regression rejects anonymous accuracy-report access before database/provider work. Full private data remains behind existing administrator authorization.
- The complete-pagination audit test covers 152 registered repositories and a provider failure. An inaccessible or rate-limited source is unknown, never a synthetic zero.

Local validation at this checkpoint: 355 unit/component tests passed, typecheck/lint/migration checks passed, and production build is run before publication. The local runtime has no isolated PostgreSQL service; its 24 integration tests are explicitly skipped locally, not reported as passing. Required hosted CI runs PostgreSQL and actual Chromium browser checks on the proposed commit. A running pipeline is not a completed release verification.

## On-demand verification

An administrator can open `/api/admin/accuracy` from the dashboard link to compare every tracked repository's persisted counters with complete live GitHub PR pagination. This is a read-only report and has no timer or LLM dependency. It reports source uncertainty and actual differences rather than modifying historical facts to force agreement. API observations occur after the grouped database read; changes made by other development sessions during that window can legitimately differ.

For an existing authorized backend runtime, `npm run audit:accuracy` uses the service's existing database/GitHub environment. Do not copy credentials into Git, chat, an issue or a screenshot. The script prints counts and repository identities, not provider credentials or PR bodies.

After merge and deployment, the existing manual **Refresh** operation queries all registered repositories and imports each owning repository's current canonical plan. Confirm its observation ID and exact coverage. Leased, failed or rate-limited work is partial. The last complete publication stays recorded; a partial run does not erase it. Source PRs must actually merge before main-source imports can observe their repaired metadata.

## Release and rollback

Merge each repair PR to `main` only after exact-head required checks succeed and the actual branch/review rules are met. Retarget each child to `main` after its parent merges; never merge a child into an already-merged feature branch and claim it reached production.

Use only the existing Engine Room deployment. Migrations 0023–0025 add observation/provenance/dependency evidence and preserve existing data. Source repairs change no provider secrets or service plans. If a release fails, redeploy the previous tested Engine Room revision or revert through a checked PR; retain additive columns and audit history instead of destructively rolling back data.

Verify HTTPS liveness/readiness, the authenticated project counters, common observation identity, stale/error states, manual coverage and prerequisite warnings on the actual deployment. Existing endpoint readiness and applied migrations prove runtime/database connectivity, not successful execution of every authenticated UI or whole-portfolio comparison. Record any remaining live check explicitly; do not claim it passed from local tests.

## Source repairs

Galinsky #126, Secure Intake #44 and National Secure Ideas #28 passed their full source CI and were merged during this recovery. Engine Room imports their live source rather than a bundled override. The actual stable engine release and National Secure Ideas production acceptance remain incomplete facts to show, not fabricated green states.
