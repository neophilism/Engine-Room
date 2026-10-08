import { projectNameIndent } from "../../lib/domain/project-hierarchy";
"use client";

import React from "react";
import type { ProjectStatus } from "../../lib/domain/portfolio";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { groupLifecycleLanes } from "../../lib/domain/lifecycle-lanes";
import { IndicatorLamp } from "../machine";

export function LifecycleLanes({ projects, selectedStatus, onSelect }: {
  projects: readonly PortfolioProjectOverview[];
  selectedStatus: ProjectStatus | "all";
  onSelect: (status: ProjectStatus | "all") => void;
}) {
  return <section className="lifecycle-lanes" aria-label="Project lifecycle lanes">
    {groupLifecycleLanes(projects).map((lane) => <article className="lifecycle-lane" key={lane.status} data-state={lane.state}>
      <button type="button" className="lifecycle-stage-control" aria-pressed={selectedStatus === lane.status}
        aria-label={`Filter ${lane.label}: ${lane.projects.length} projects`}
        onClick={() => onSelect(selectedStatus === lane.status ? "all" : lane.status)}>
        <IndicatorLamp label={lane.label} state={lane.state} size="small" />
        <span>{lane.label}</span><strong>{lane.projects.length}</strong>
      </button>
      <p>{lane.description}</p>
      {lane.projects.length > 0 ? <ul>{lane.projects.map((project) => <li key={project.id}><span className={projectNameIndent(project, lane.projects) > 0 ? "project-name-indent" : undefined}>{project.displayName}</span></li>)}</ul> : <span className="lifecycle-empty">No projects</span>}
    </article>)}
  </section>;
}
