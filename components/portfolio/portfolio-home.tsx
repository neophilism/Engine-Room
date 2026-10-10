import React from "react";
import {
  BrassPanel,
  FlowStation,
  IndicatorLamp,
  MachineFlow
} from "../machine";
import { MachinePreview } from "../machine/machine-preview";
import { PortfolioBrowser } from "./portfolio-browser";
import { PortfolioRefresh } from "./portfolio-refresh";
import { PortfolioProgressMachine } from "./portfolio-progress-machine";
import type { PortfolioOverviewData } from "../../lib/domain/portfolio-overview";
import type { RenderReadout } from "../../lib/domain/render-deployments";
import { RenderServiceReadouts } from "./render-service-readouts";
import { GitHubSourceReadout } from "./github-source-readout";
import { ActivityMonitor } from "./activity-monitor";
import { PlatformMetrics } from "./platform-metrics";

function sourceLabel(source: PortfolioOverviewData["source"]) {
  if (source === "database") return "Stored portfolio records";
  if (source === "error") return "Portfolio data unavailable";
  return "Database not configured";
}

export function PortfolioHome({
  overview,
  renderServices = []
}: {
  overview: PortfolioOverviewData;
  renderServices?: readonly RenderReadout[];
}) {
  const { projects, statistics } = overview;
  const observed = projects.reduce((total, project) => total + (project.activity?.total ?? 0), 0);
  const merged = projects.reduce((total, project) => total + (project.activity?.merged ?? 0), 0);
  const open = projects.reduce((total, project) => total + (project.activity?.open ?? 0), 0);
  const represented = projects.filter(project => project.activity !== undefined).length;

  return (
    <main className="content">
      <header className="hero">
        <p className="eyebrow">Software Portfolio</p>
        <h1>Engine Room</h1>
        <p>
          Portfolio-wide control from approved development plan through
          production operations.
        </p>
      </header>

      <section aria-label="Recorded GitHub development activity">
        <div className="section-heading">
          <div><p className="eyebrow">Verified repository activity</p><h2>Actual GitHub work</h2></div>
        </div>
        <p className="portfolio-calculation-note">These counts come from stored, source-linked GitHub pull requests. They measure observed activity, not remaining roadmap work, deploy readiness or complete GitHub coverage.</p>
        <div className="portfolio-stat-grid">
          <article className="portfolio-stat"><span>Observed GitHub PR records</span><strong>{observed > 0 ? observed : "N/A"}</strong></article>
          <article className="portfolio-stat"><span>Observed merged PRs</span><strong>{observed > 0 ? merged : "N/A"}</strong></article>
          <article className="portfolio-stat"><span>Observed open PRs</span><strong>{observed > 0 ? open : "N/A"}</strong></article>
          <article className="portfolio-stat"><span>Projects with PR records</span><strong>{represented}/{projects.length}</strong></article>
        </div>
      </section>

      <p className="portfolio-calculation-note">Roadmap completion below is only available where source plans and GitHub mappings are verified. A project may have real development activity even when its plan completion is N/A.</p>
      <section className="portfolio-stat-grid" aria-label="Live portfolio statistics">
        <article className="portfolio-stat">
          <span>Projects tracked</span>
          <strong>{statistics.projects}</strong>
        </article>
        <article className="portfolio-stat">
          <span>Projects in active stages</span>
          <strong>{statistics.activeProjects}</strong>
        </article>
        <article className="portfolio-stat">
          <span>Mapped original items merged</span>
          <strong>
            {statistics.plannedRoadmapPrs > 0 ? `${statistics.completedRoadmapPrs}/${statistics.plannedRoadmapPrs}` : "N/A"}
          </strong>
        </article>
        <article className="portfolio-stat">
          <span>Mapped roadmap progress</span>
          <strong>{statistics.plannedRoadmapPrs > 0 ? `${statistics.percent}%` : "N/A"}</strong>
        </article>
      </section>

      <p className="portfolio-calculation-note">Source documents: {projects.filter(p=>p.planned>0||p.sourcePlan?.documents.length).length}/{projects.length} projects. Fully mapped original completion: {projects.filter(p=>p.planned>0&&p.completionMeasured!==false).length}/{projects.length}. The aggregate covers verified original mappings; unmapped work and production health remain separate.</p>
      <GitHubSourceReadout />
      <ActivityMonitor projects={projects} />
      <PortfolioProgressMachine projects={projects} />
      <RenderServiceReadouts services={renderServices} />
      <PlatformMetrics />
      <PortfolioRefresh />

      <BrassPanel
        eyebrow="Live roadmap"
        title="Portfolio progress"
        status={
          <IndicatorLamp
            state={overview.source === "database" ? "neutral" : "warning"}
            label={sourceLabel(overview.source)}
          />
        }
      >
        {projects.length > 0 ? (
          <PortfolioBrowser projects={projects} />
        ) : (
          <div className="portfolio-empty-state">
            <strong>{sourceLabel(overview.source)}</strong>
            <p>
              Approved projects will appear here automatically after registration.
            </p>
          </div>
        )}

        <div className="home-machine-flow">
          <p className="machine-engraved-label">Roadmap signal path</p>
          <MachineFlow label="Roadmap progress data path">
            <FlowStation
              eyebrow="01"
              title="Approved Plan"
              detail="Defines the denominator."
            />
            <FlowStation
              eyebrow="02"
              title="Repository Stacks"
              detail="Split roadmap work by repository."
            />
            <FlowStation
              eyebrow="03"
              title="Merge Events"
              detail="Advance completed work."
            />
            <FlowStation
              eyebrow="04"
              title="Portfolio State"
              detail="Updates tubes and statistics."
            />
          </MachineFlow>
        </div>
      </BrassPanel>
      <MachinePreview />
    </main>
  );
}
