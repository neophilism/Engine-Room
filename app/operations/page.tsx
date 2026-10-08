import React from "react";
import { OperationsDashboard } from "../../components/operations/operations-dashboard";
import { PortfolioRefresh } from "../../components/portfolio/portfolio-refresh";
import { loadOperationsOverview } from "../../lib/server/operations";
import { loadTelemetryFeeds } from "../../lib/server/telemetry";
import { TelemetryFeeds } from "../../components/operations/telemetry-feeds";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const [overview, feeds] = await Promise.all([loadOperationsOverview(), loadTelemetryFeeds()]);
  const evaluatedAt = new Date().toISOString();
  return <main className="content"><header className="hero"><p className="eyebrow">System Operations</p><h1>Operations & Performance</h1>
    <p>Follow measured availability, latency, request volume, errors, and resource load across projects.</p></header>
    <PortfolioRefresh /><OperationsDashboard overview={overview} evaluatedAt={evaluatedAt} /><TelemetryFeeds data={feeds} evaluatedAt={evaluatedAt} /></main>;
}
