import React from "react";
import { AccessDashboard } from "../../components/access/access-dashboard";
import { PortfolioRefresh } from "../../components/portfolio/portfolio-refresh";
import { loadAccessOverview } from "../../lib/server/access";
import { AccessAnalytics } from "../../components/access/access-analytics";

export const dynamic = "force-dynamic";
export default async function UsersPage() {
  const overview = await loadAccessOverview(), evaluatedAt = new Date().toISOString();
  return <main className="content"><header className="hero"><p className="eyebrow">Identity &amp; Control</p><h1>Users &amp; Access</h1><p>Inspect recorded identities, organizations, roles, and security signals across projects.</p></header><PortfolioRefresh /><AccessDashboard overview={overview} evaluatedAt={evaluatedAt} /><AccessAnalytics overview={overview} evaluatedAt={evaluatedAt} /></main>;
}
