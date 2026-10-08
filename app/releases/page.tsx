import React from "react";
import { ReleasesDashboard } from "../../components/operations/releases-dashboard";
import { PortfolioRefresh } from "../../components/portfolio/portfolio-refresh";
import { loadReleasesOverview } from "../../lib/server/releases";

export const dynamic = "force-dynamic";
export default async function ReleasesPage() {
  const overview = await loadReleasesOverview();
  return <main className="content"><header className="hero"><p className="eyebrow">Delivery</p><h1>Releases</h1><p>Follow recorded build, approval, rollout, production, and rollback events.</p></header>
    <PortfolioRefresh /><ReleasesDashboard overview={overview} /></main>;
}
