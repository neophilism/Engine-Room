# Coordinated source reconciliation

Engine Room ER-062 repairs source-owned metadata rather than keeping override copies inside the tracker.

| Owning repository | Source repair PR | Evidence and scope |
| --- | --- | --- |
| Galinsky-2028 | https://github.com/neophilism/Galinsky-2028/pull/126 | Actual 4 open / 116 closed observation, 111 accepted merges, later contribution links, help/sharing partial source and explicit remaining full scope |
| Secure-Intake-Case-Workflow-Engine | https://github.com/neophilism/Secure-Intake-Case-Workflow-Engine/pull/44 | Explicit ADR-to-PR identities, historic overlapping units disclosed, main consolidation versus closed-unmerged PR, partial production contributions and SI-42 requirements |
| National-Secure-Ideas-Submission | https://github.com/neophilism/National-Secure-Ideas-Submission/pull/28 | Source-owned upstream-first stable-release gate, exact prerelease lock, positive/negative dependency validation and production guard |

Each source PR has its own full CI and must merge before normal main-source reconciliation imports it. Until then Engine Room should honestly retain the older main observation and show unknown/incomplete dependency evidence. A proposed or merely open source repair is not a deployed source change.

The existing Boardroom source consumer `src/server/roadmap-import.ts` preserves external dependency/prerequisite fields, and `src/server/chain-evidence.ts` compares canonical dependency declarations against its assignment before consequential actions. Engine Room now preserves the same fields instead of dropping them. This source review is not a remote acknowledgment that Boardroom has already reimported these pending source PRs.

The new plan-reconciliation diagnostic counts accepted merged PRs absent from current plan mappings separately from accepted contribution PRs. It examines all stored PR rows, rather than the UI's limited recent history. An unlinked docs/CI/maintenance PR is still accepted; this diagnostic cannot fabricate a work-package completion or force every housekeeping PR into an arbitrary scope.

Validation in the source repositories: Galinsky source checks, 17 focused source tests and three registry tests; Secure Intake typecheck, 22 focused implementation tests and canonical checks; National Secure Ideas policy, registry, two dependency positive/negative tests and template production preflight. Each source PR also runs existing full hosted CI. No provider secret, database content, production configuration or paid resource was changed by these metadata repairs.
