# Approved Engine Room PR source mapping

The approved Engine Room plan in `.exechub/project.yml` and 40 numbered descriptions in `docs/development-plan.md` are the source of the roadmap denominator. The explicitly reviewed `.exechub/approved-pr-mapping.json` is the source of repository-local GitHub PR associations.

The original work units 1–37 map to GitHub PRs #1–#37. Roadmap unit 38 (About / Onboarding) maps to merged GitHub PR #39; unit 39 (acceptance tests and security checks) maps to PR #43; unit 40 (release integration and runbook) maps to merged PR #45. These remappings are explicit because concurrent operational PRs consumed numbers #38 and #40.

The import runs only after a successful public GitHub repository and PR synchronization. It reconstructs the canonical SHA-256 fingerprint of the approved manifest, verifies all 40 mapped GitHub PR records exist, and transactionally writes plan, milestone, and planned-PR associations. A differing immutable approved-plan fingerprint or conflicting existing mapping fails without modifying current records. Completion remains evidence-based: only merged_at from GitHub counts. It does not certify app uptime, a completed penetration test, working backups, or production release readiness.

The scheduled best-effort public sync runs on instance startup and every two hours while the web process is awake. For near-real-time or private-repo updates, configure the GitHub App and a trusted external scheduler. The import is repeatable and idempotent.
