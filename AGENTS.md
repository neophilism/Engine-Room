## Owner security-review policy — 2026-10-13

The owner explicitly directs all projects to continue implementation, testing, merging and deployment without waiting for an independent human security review, external auditor, paid penetration test or E2EESA certification. This supersedes older repository planning text that makes absence of such review an operational prerequisite.

- Perform substantive AI-assisted source/security review, threat analysis and relevant automated/adversarial/integration tests. Fix concrete findings and retain source-bound evidence.
- Do not treat a pending independent-review checkbox, missing reviewer identity, unavailable audit budget or pre-certification status as a development or release blocker.
- External expert review is deferred follow-up work. Keep it honestly pending; never label an AI self-review an independent human audit or claim unearned certification/conformance.
- Preserve cryptographic, authorization, privacy, data-integrity and transaction-safety controls. Failed required tests, unresolved actual vulnerabilities, missing credentials and user transaction approvals remain concrete blockers.
- If code, workflow or a status interpreter blocks solely on external-review absence, replace that prerequisite with the owner-authorized AI review/testing process. Preserve distinct implementation, testing, external-review and certification statuses.
- Continue dependency-ready work and chain PRs. Do not ask the owner again to waive the human-review prerequisite.

# Engine Room repository instructions

- Read `docs/STRUCTURED_PR_REGISTRY.md` and `docs/REPOSITORY_ROADMAP_CONTRACT.md` before changing roadmap integration.
- The source repository owns its approved work units (`registry/prs.json`). GitHub's actual Pull Requests API owns observed PR status. Engine Room only joins them into a database-derived, refreshable progress view.
- Never open an Engine Room PR merely to recopy another repository's `registry/prs.json` or refresh a bundled `registry/pr-snapshots` file. A progress change must be reflected by a live source fetch and GitHub API reconciliation.
- Do not invent a PR-to-work-unit mapping from numerical position or approximate title similarity. A unique, exact roadmap ID in a GitHub PR title may be joined dynamically. For other cases update the owning repository's approved mapping only.
- Preserve all planned units in the denominator, including uncreated PRs and later additions. Green is verified merged mapped work; yellow is a linked open PR; empty is unstarted/unmapped work. Always display raw GitHub merged PR counts separately.
- The header **Refresh** action must really query all registered GitHub repositories and then recompute planned progress; it cannot only call `router.refresh()`. Never claim success if repositories are skipped, rate-limited, or historical snapshots are the only source.
- Optional GitHub check/review/commit ancestry endpoints must not block the core PR list. Make failure provenance clear per repository.
- Test new sync logic, run CI and deploy the code only after required gates succeed, and verify counts/freshness against live GitHub and Neon.

## Shared PR registry

Use `registry/prs.json` as the sole active PR plan for Boardroom and Engine Room. Follow `registry/PR_FORMAT.md` and run `node scripts/validate-pr-registry.mjs`. Preserve stable IDs, scope, counts, dependencies, acceptance and contribution-only evidence. `registry/roadmap.json` is retired; never recreate a duplicate milestone plan. This contract supersedes older file-path guidance.
