> **Canonical and expanded PR work registry:** [`registry/roadmap.json`](../registry/roadmap.json). This 40-item original plan is preserved intact below; all later additions and PR evidence are maintained only in the canonical registry.

# Engine-Room: complete development plan and handoff

**Source:** [docs/development-plan.md](../docs/development-plan.md) (existing approved project plan, preserved below without omissions).

**Before continuing development:** read the whole plan; inspect the repository's current `main` branch, open/merged PRs, CI, available deployments, and configuration. A planned task is not evidence of completion, and a merged PR is not proof of production readiness. Consult [docs/approved-roadmap-mapping.md](../docs/approved-roadmap-mapping.md), [docs/plan-import-coverage.md](../docs/plan-import-coverage.md), [docs/production-release.md](../docs/production-release.md).

**Important:** The 40-item approved roadmap is the original scope. Later PRs and production work may extend it; verify actual PR and deployment state independently.

---

# Engine Room Development Plan

Engine Room is tracked against a 40-PR approved development plan. Roadmap completion is based on merged planned PRs divided by the approved planned PR count.

## Phase I — Foundation and visual machine system

1. Repository foundation, Next.js/TypeScript application, linting, tests, CI.
2. Core application architecture, routing, database layer, environment configuration.
3. Engine Room domain model: projects, repositories, development plans, milestones, planned PRs.
4. Global responsive shell: top bar, desktop sidebar, tablet/mobile navigation.
5. Steampunk machine design tokens: brass, glass, patina, typography, lighting, spacing.
6. Mechanical component library: BrassPanel, GlassTube, Lamp, Gauge, Valve, Pipe.
7. Responsive pipe-routing and machine-layout system.
8. Animation system, machine-state transitions, reduced-motion accessibility.

## Phase II — GitHub and roadmap engine

9. GitHub App/integration foundation and repository discovery.
10. GitHub webhook ingestion and signed webhook validation.
11. Repository/PR synchronization and periodic reconciliation.
12. .exechub/project.yml development-plan manifest parser.
13. Versioned approved-development-plan model.
14. Planned-PR completion calculation engine.
15. Milestone completion and lifecycle-state calculation.
16. Automatic project registration from approved development plans.

## Phase III — Portfolio Home

17. Portfolio Overview foundation and live portfolio statistics.
18. Stacked repository progress tubes and PR-count labels.
19. Right-arrow/down-arrow project expansion control and animated expandable drawer.
20. Summary / Features / At a Glance accordions.
21. Total Portfolio Progress machine and aggregate calculation.
22. Search, sorting, filters, activity indicators, GitHub quick links.

## Phase IV — Project intelligence

23. Projects comparison page.
24. Lifecycle lanes and mechanical stage-light system.
25. Individual Project Dashboard.
26. Feature tracking: implemented / underway / remaining.
27. Development activity: PRs, commits, issues, reviews, workflows.
28. Risks, blockers, next actions, release-readiness calculations.

## Phase V — Operational dashboards

29. Operations & Performance dashboard.
30. Releases dashboard and release-pipeline machine.
31. Alerts & Incidents dashboard and source-to-resolution machine.
32. Generic telemetry ingestion/adaptor framework.

## Phase VI — People and money

33. Finance dashboard and financial data model.
34. Cost/revenue/forecast adapters and financial-flow visualization.
35. Users & Access dashboard.
36. Cross-project user, organization, role and security analytics.

## Phase VII — Administration and onboarding

37. Settings & Automation master control page.
38. About / Overview onboarding experience based on the approved specification mockups.

## Phase VIII — Production release

39. Responsive/accessibility/performance/security acceptance suite.
40. Production deployment, observability, backup/restore, release documentation and Engine Room 1.0.
