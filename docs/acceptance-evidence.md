# Engine Room acceptance evidence protocol

PR 39 (roadmap milestone): the automated CI pipeline runs TypeScript, ESLint, Vitest, production build and Playwright Chromium checks, including mobile onboarding, readiness truthfulness and unauthorized administration. The CI result is evidence for these checks alone.

The production acceptance checklist requires independently collected dated evidence for:

- Desktop/tablet/mobile interaction and WCAG 2.2 AA audit with keyboard and screen-reader checks.
- Measured Core Web Vitals, startup latency, API p95, and load performance in the real deployment.
- Authentication/MFA, token scoping and rotation, CSRF/origin boundaries, permissions and session safety.
- External penetration testing and dependency/SBOM review.
- Signed data feed ingestion, freshness, and actual cross-project integrity.
- Disaster recovery: observed successful backup and restore, with RPO/RTO documented and measured.
- Monitoring and alerts: service availability and incidents visible to operators.
- Verified HTTPS endpoint and production rollback test.

Do not mark any of the above as passed solely because a unit test, CI build, or static implementation exists. Attach links to the actual evidence and date in a separate signed production acceptance report.

## Workflow

Run `npm run typecheck && npm run lint && npm run test && npm run build && npm run test:browser` in CI. Inspect failure logs before merging. Use `GET /api/ready` to gate production traffic; `GET /api/health` only indicates process health.
