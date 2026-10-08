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

function sourceLabel(source: PortfolioOverviewData["source"]) {
  if (source === "database") return "Live portfolio data";
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
          <span>Roadmap PRs merged</span>
          <strong>
            {statistics.plannedRoadmapPrs > 0 ? `${statistics.completedRoadmapPrs}/${statistics.plannedRoadmapPrs}` : "Not measured"}
          </strong>
        </article>
        <article className="portfolio-stat">
          <span>Portfolio completion</span>
          <strong>{statistics.plannedRoadmapPrs > 0 ? `${statistics.percent}%` : "Not measured"}</strong>
        </article>
      </section>

      <PortfolioProgressMachine projects={projects} />
      <RenderServiceReadouts services={renderServices} />
      <PortfolioRefresh />

      <BrassPanel
        eyebrow="Live roadmap"
        title="Portfolio progress"
        status={
          <IndicatorLamp
            state={overview.source === "database" ? "live" : "warning"}
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
