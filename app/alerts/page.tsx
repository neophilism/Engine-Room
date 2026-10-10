import { SourceAlerts } from "../../components/operations/source-alerts";
import { ActivityMonitor } from "../../components/portfolio/activity-monitor";
import { loadPortfolioOverview } from "../../lib/server/portfolio-overview";
import { loadLiveSnapshot } from "../../lib/server/live-monitor";
import { getDatabasePool } from "../../lib/server/database";
import React from "react";
import { loadPodcastInquiryAlerts } from "../../lib/server/podcast-inquiry-alerts";
import { PodcastProductionAlert } from "../../components/podcast-production-alert";
import { IncidentsDashboard } from "../../components/operations/incidents-dashboard";
import { PortfolioRefresh } from "../../components/portfolio/portfolio-refresh";
import { loadIncidentsOverview } from "../../lib/server/incidents";

export const dynamic = "force-dynamic";
export default async function AlertsPage() {
  const [snapshot,portfolio,inquiryAlerts,errors]=await Promise.all([loadLiveSnapshot().catch(()=>null),loadPortfolioOverview(),loadPodcastInquiryAlerts(),getDatabasePool().query("SELECT r.full_name,s.last_error,s.last_success_at FROM github_repository_sync s JOIN repositories r ON r.id=s.repository_id WHERE s.last_error IS NOT NULL OR s.last_success_at IS NULL").catch(()=>({rows:[]}))]);
  return <main className="content"><header className="hero"><p className="eyebrow">Mission Control</p><h1>Alerts &amp; Incidents</h1><p>Follow measured incidents through acknowledgement, containment, and resolution.</p></header><PodcastProductionAlert summary={inquiryAlerts} /><PortfolioRefresh /><SourceAlerts snapshot={snapshot} errors={errors.rows}/><ActivityMonitor projects={portfolio.projects.map(p=>({...p,pullRequests:p.pullRequests?.filter(pr=>pr.checks==="failing"||pr.mergeable===false)}))}/><IncidentsDashboard overview={await loadIncidentsOverview()} /></main>;
}
