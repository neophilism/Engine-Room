import React from "react";
import { IncidentsDashboard } from "../../components/operations/incidents-dashboard";
import { PortfolioRefresh } from "../../components/portfolio/portfolio-refresh";
import { loadIncidentsOverview } from "../../lib/server/incidents";

export const dynamic = "force-dynamic";
export default async function AlertsPage() {
  return <main className="content"><header className="hero"><p className="eyebrow">Mission Control</p><h1>Alerts &amp; Incidents</h1><p>Follow measured incidents through acknowledgement, containment, and resolution.</p></header><PortfolioRefresh /><IncidentsDashboard overview={await loadIncidentsOverview()} /></main>;
}
