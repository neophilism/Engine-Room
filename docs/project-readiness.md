# Risks, blockers, next actions, and release readiness

Project dashboards derive ordered next actions from missing plans, unmapped or unfinished roadmap work, blocked milestones, recorded blockers, missing release targets, and failed/unknown evidence gates.

Release targets identify an immutable 40-character commit SHA and environment. Required gates are tests, build, responsive behavior, accessibility, performance, security, deployment, observability, and backup/restore. Each must have a current passing evidence record for that exact target. Missing, expired, future-dated, or different-target records do not pass. Complete roadmap work, no open blockers, and every required gate are needed for **ready**; a complete roadmap with absent acceptance evidence remains **not assessed**.

Trusted server functions `registerProjectRisk`, `setProjectReleaseTarget`, and `recordProjectReleaseEvidence` persist operator-supplied records. Evidence includes a source URL, observed time, and expiry; storage records an assessment, it does not execute the check or verify the source's authenticity. These functions have no unauthenticated HTTP write endpoint. Actual production acceptance is performed in PRs 39–40.

An open risk list with no records means no risks have been recorded, not that the project has been assessed risk-free. Changing the release target cannot reuse older-target acceptance evidence.
