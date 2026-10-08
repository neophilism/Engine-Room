export const platformDefinitions = [
  { label: "Roadmap progress", meaning: "Merged planned pull requests linked by repository and number to an approved development plan. Unmapped PRs never advance progress." },
  { label: "Portfolio progress", meaning: "The sum of merged roadmap units divided by the sum of planned roadmap units across projects with approved plans." },
  { label: "Feature state", meaning: "Implemented, underway, or remaining from mapped approved-plan work; not a claim of deployment." },
  { label: "Release readiness", meaning: "Evidence for the selected commit and environment, with unknown and expired gates clearly distinguished from passes." },
  { label: "Operational health", meaning: "Observed source metrics with provenance, environment, and time; missing telemetry means unknown, not healthy." },
  { label: "Access posture", meaning: "Source-scoped recorded identities and grants; unknown MFA and stale observations do not imply compliance." },
  { label: "Finance", meaning: "Recorded money movements and forecasts in their original currencies; different currencies are not added as one total." }
] as const;

export const platformSections = [
  { path: "/", title: "Portfolio home", description: "Review project progress and expand repository machines to see mapped PR counts." },
  { path: "/projects", title: "Project intelligence", description: "Compare projects and inspect features, GitHub activity, risks, milestones, and readiness." },
  { path: "/operations", title: "Operations", description: "Inspect measured performance samples and connected-source freshness." },
  { path: "/releases", title: "Releases", description: "Follow explicit release transitions and supporting evidence." },
  { path: "/alerts", title: "Alerts & incidents", description: "Observe source alerts and audited incident response status." },
  { path: "/finance", title: "Finance", description: "Review costs, revenue, and forecasts without concealing currency differences." },
  { path: "/users", title: "Users & access", description: "Compare source-scoped user grants, privileged roles, MFA, and credential review findings." },
  { path: "/settings", title: "Settings & automation", description: "Configure an authorized GitHub reconciliation policy, review audits, and run a manual sync." }
] as const;
