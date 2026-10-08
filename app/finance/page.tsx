import React from "react";
import { FinanceDashboard } from "../../components/finance/finance-dashboard";
import { PortfolioRefresh } from "../../components/portfolio/portfolio-refresh";
import { loadFinanceOverview } from "../../lib/server/finance";

export const dynamic = "force-dynamic";
export default async function FinancePage() {
  return <main className="content"><header className="hero"><p className="eyebrow">Portfolio Economics</p><h1>Finance</h1><p>Compare recorded cost, revenue, and forecasts in their accounting currency.</p></header><PortfolioRefresh /><FinanceDashboard overview={await loadFinanceOverview()} initialPeriod={new Date().toISOString().slice(0, 7)} /></main>;
}
