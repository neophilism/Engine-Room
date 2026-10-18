import React from "react";
import {InventoryReadout} from "./inventory-readout";
import { PodcastProductionAlert } from "../podcast-production-alert";
import type { PodcastInquiryAlertSummary } from "../../lib/server/podcast-inquiry-alerts";
import { BrassPanel } from "../machine";
import { PortfolioBrowser } from "./portfolio-browser";
import { PortfolioRefresh } from "./portfolio-refresh";
import type { PortfolioOverviewData } from "../../lib/domain/portfolio-overview";
import type { RenderReadout } from "../../lib/domain/render-deployments";
import { RenderServiceReadouts } from "./render-service-readouts";
import { GitHubSourceReadout } from "./github-source-readout";
import { ActivityMonitor } from "./activity-monitor";
import { PlatformMetrics } from "./platform-metrics";
import { DevelopmentVelocity } from "./development-velocity";
import type { DevelopmentVelocityData } from "../../lib/domain/development-velocity";

function sourceLabel(source: PortfolioOverviewData["source"]) {
  if (source === "database") return "Data connected";
  if (source === "error") return "Data unavailable";
  return "Setup required";
}

export function PortfolioHome({
  overview,
  renderServices = [],
  inquiryAlerts = null,
  velocity, githubStatus
}: {
  overview: PortfolioOverviewData;
  renderServices?: readonly RenderReadout[];
  inquiryAlerts?: PodcastInquiryAlertSummary | null;
  velocity?: DevelopmentVelocityData;
  githubStatus?: import("../../lib/server/public-github-status").PublicGitHubStatus;
}) {
  const { projects, statistics } = overview;
  const sourced = projects.filter(p => p.planned > 0 || p.sourcePlan?.documents.length).length;

  return (
    <main className="content dashboard-home">
      <header className="hero dashboard-home-hero">
        <div>
          <p className="eyebrow">Portfolio overview</p>
          <h1>Engine Room</h1>
          <p>Projects, delivery progress, and source-backed status in one place.</p>
        </div>
        <span className={`dashboard-data-chip${overview.source === "database" ? " is-connected" : ""}`}>
          {sourceLabel(overview.source)}
        </span>
      </header>

      <PodcastProductionAlert summary={inquiryAlerts} />

      <section className="portfolio-stat-grid" aria-label="Live portfolio statistics">
        <article className="portfolio-stat">
          <span>Projects tracked</span>
          <strong>{overview.source==="database"?statistics.projects:"N/A"}</strong>
          <small>Registered projects, including separately tracked implementations.</small>
        </article>
        <article className="portfolio-stat">
          <span>Active projects</span>
          <strong>{overview.source==="database"?statistics.activeProjects:"N/A"}</strong>
          <small>Development, beta, live, or maintenance. PR activity starts planned projects; paused, archived, and complete projects are excluded.</small>
        </article>
        <article className="portfolio-stat">
          <span>Planned PRs completed</span>
          <strong>{overview.source==="database"&&statistics.plannedRoadmapPrs > 0 ? `${statistics.percent}%` : "N/A"}</strong>
          {overview.source==="database"&&statistics.plannedRoadmapPrs > 0 && <small>
            <span>{statistics.completedRoadmapPrs}/{statistics.plannedRoadmapPrs}</span> planned work units mapped to merged PRs.
          </small>}
        </article>
        <article className="portfolio-stat">
          <span>GitHub PRs open / closed</span>
          <strong>{overview.prSummary ? `${overview.prSummary.open} / ${overview.prSummary.closed}` : "N/A"}</strong>
        </article>
      </section>

      <p className="portfolio-progress-key" aria-label="Development status legend">
        <span className="planned-progress-legend">
          <span className="merged">Green: mapped merged work</span>
          <span className="underway">Yellow: in progress / awaiting acceptance</span>
          <span className="unstarted">Empty: not reconciled or unstarted</span>
        </span>
        <span>Original and newly added work share the same total.</span>
      </p>

      {overview.observationId&&<p className="metric-freshness">Observation {overview.observationId} · {overview.checkedAt}</p>}
      {overview.reconciliation&&<p className="metric-freshness" role="status">Refresh {overview.reconciliation.id}: {overview.reconciliation.status} · {overview.reconciliation.completed}/{overview.reconciliation.requested} repositories completed · {overview.reconciliation.deferred} deferred. Last complete publication: {overview.reconciliation.publishedAt??"none"}. Counts show persisted observations; each repository retains its own source time.</p>}
      <p><a href="/api/admin/accuracy" target="_blank" rel="noopener noreferrer">Run read-only GitHub accuracy report</a> · Explicitly compares every tracked repository; no background schedule.</p>
      <InventoryReadout projects={projects}/>
      <GitHubSourceReadout initialStatus={githubStatus}/>

      {velocity && <DevelopmentVelocity data={velocity} />}

      <section className="dashboard-primary-section" aria-label="Project development progress">
        <BrassPanel
          eyebrow="Development overview"
          title="Project progress"
          status={<span className="dashboard-coverage-caption">{sourced} of {projects.length} plans tracked</span>}
        >
          {projects.length > 0 ? (
            <PortfolioBrowser projects={projects} />
          ) : (
            <div className="portfolio-empty-state">
              <strong>{overview.source === "error" ? "Portfolio data unavailable" :
                overview.source === "unconfigured" ? "Database not configured" : "No projects yet"}</strong>
              <p>Projects will appear after registration and source synchronization.</p>
            </div>
          )}
          <p className="portfolio-calculation-note dashboard-source-footnote">
            Progress counts all documented work, including unmapped milestones and plan additions.
            Yellow is written but unmerged; a 0% green bar does not necessarily mean no code exists.
          </p>
        </BrassPanel>
        <PortfolioRefresh />
      </section>

      <details className="dashboard-operations-details">
        <summary>
          <span><strong>Activity and connected services</strong>
            <small>Open PRs, deployments, source health, and platform metrics</small></span>
          <span className="dashboard-operations-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="dashboard-operations-content">
          <ActivityMonitor projects={projects} />
          <RenderServiceReadouts services={renderServices} />
          <PlatformMetrics />
        </div>
      </details>
    </main>
  );
}
