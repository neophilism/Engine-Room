export type DashboardRoute = {
  href: string;
  label: string;
  description: string;
};

export const dashboardRoutes: readonly DashboardRoute[] = [
  { href: "/", label: "Home", description: "Compact portfolio overview and total progress." },
  { href: "/projects", label: "Projects", description: "Cross-project lifecycle and roadmap comparison." },
  { href: "/finance", label: "Finance", description: "Spend, revenue, forecasting, and unit economics." },
  { href: "/users", label: "Users", description: "Portfolio-wide adoption, roles, and access posture." },
  { href: "/operations", label: "Operations", description: "Reliability, CI/CD, performance, and source health." },
  { href: "/releases", label: "Releases", description: "Release readiness, approvals, and rollout." },
  { href: "/alerts", label: "Alerts", description: "Live alerts, incidents, escalation, and resolution." },
  { href: "/about", label: "About", description: "Platform overview, metric definitions, and onboarding." },
  { href: "/settings", label: "Settings", description: "Integrations, automation, permissions, and system behavior." }
] as const;

export function getDashboardRoute(href: string) {
  return dashboardRoutes.find((route) => route.href === href);
}
