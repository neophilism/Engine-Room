# Engine Room repository instructions

- Read `docs/STRUCTURED_PR_REGISTRY.md` and `docs/REPOSITORY_ROADMAP_CONTRACT.md` before changing roadmap integration.
- The source repository owns its approved work units (`registry/prs.json`). GitHub's actual Pull Requests API owns observed PR status. Engine Room only joins them into a database-derived, refreshable progress view.
- Never open an Engine Room PR merely to recopy another repository's `registry/prs.json` or refresh a bundled `registry/pr-snapshots` file. A progress change must be reflected by a live source fetch and GitHub API reconciliation.
- Do not invent a PR-to-work-unit mapping from numerical position or approximate title similarity. A unique, exact roadmap ID in a GitHub PR title may be joined dynamically. For other cases update the owning repository's approved mapping only.
- Preserve all planned units in the denominator, including uncreated PRs and later additions. Green is verified merged mapped work; yellow is a linked open PR; empty is unstarted/unmapped work. Always display raw GitHub merged PR counts separately.
- The header **Refresh** action must really query all registered GitHub repositories and then recompute planned progress; it cannot only call `router.refresh()`. Never claim success if repositories are skipped, rate-limited, or historical snapshots are the only source.
- Optional GitHub check/review/commit ancestry endpoints must not block the core PR list. Make failure provenance clear per repository.
- Test new sync logic, run CI and deploy the code only after required gates succeed, and verify counts/freshness against live GitHub and Neon.
