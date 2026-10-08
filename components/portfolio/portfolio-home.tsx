import React from "react";
import {
  BrassPanel,
  FlowStation,
  GlassTube,
  IndicatorLamp,
  MachineFlow
} from "../machine";
import type { PortfolioOverviewData } from "../../lib/server/portfolio-overview";

function sourceLabel(source: PortfolioOverviewData["source"]) {
  if (source === "database") return "Live portfolio data";
  if (source === "error") return "Portfolio data unavailable";
  return "Database not configured";
}

export function PortfolioHome({
  overview
}: {
  overview: PortfolioOverviewData;
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
          <span>Active systems</span>
          <strong>{statistics.activeProjects}</strong>
        </article>
        <article className="portfolio-stat">
          <span>Roadmap PRs merged</span>
          <strong>
            {statistics.completedRoadmapPrs}/{statistics.plannedRoadmapPrs}
          </strong>
        </article>
        <article className="portfolio-stat">
          <span>Portfolio completion</span>
          <strong>{statistics.percent}%</strong>
        </article>
      </section>

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
          <div className="project-list">
            {projects.map((project) => {
              const state =
                project.planned > 0 && project.completed === project.planned
                  ? "complete"
                  : project.inProgress > 0
                    ? "active"
                    : "live";

              return (
                <article className="project-row" key={project.id}>
                  <button
                    className="disclosure"
                    aria-label={`Expand ${project.displayName}`}
                  >
                    ▶
                  </button>
                  <strong>{project.displayName}</strong>
                  <GlassTube
                    value={project.completed}
                    max={Math.max(project.planned, 1)}
                    label={`${project.displayName} roadmap progress`}
                    state={state}
                    showScale
                  />
                  <span className="count">
                    {project.completed}/{project.planned} PRs
                  </span>
                  <span className="percentage">{project.percent}%</span>
                </article>
              );
            })}
          </div>
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
              title="Planned PRs"
              detail="Roadmap work units."
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
    </main>
  );
}
