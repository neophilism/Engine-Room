import React from "react";
import { OperationsDashboard } from "../../components/operations/operations-dashboard";
import { PortfolioRefresh } from "../../components/portfolio/portfolio-refresh";
import { loadOperationsOverview } from "../../lib/server/operations";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const overview = await loadOperationsOverview();
  return <main className="content"><header className="hero"><p className="eyebrow">System Operations</p><h1>Operations & Performance</h1>
    <p>Follow measured availability, latency, request volume, errors, and resource load across projects.</p></header>
    <PortfolioRefresh /><OperationsDashboard overview={overview} evaluatedAt={new Date().toISOString()} /></main>;
}
