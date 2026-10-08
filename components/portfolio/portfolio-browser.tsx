"use client";

import { projectNameIndent } from "../../lib/domain/project-hierarchy";

import React, { useState } from "react";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { defaultPortfolioQuery, queryPortfolio } from "../../lib/domain/portfolio-query";
import { PortfolioControls } from "./portfolio-controls";
import { ProjectProgressStack } from "./project-progress-stack";

export function PortfolioBrowser({ projects }: { projects: readonly PortfolioProjectOverview[] }) {
  const [query, setQuery] = useState(defaultPortfolioQuery);
  const visible = queryPortfolio(projects, query);

  return (
    <div>
      <PortfolioControls query={query} onChange={setQuery} />
      <p className="portfolio-result-count" aria-live="polite">Showing {visible.length} of {projects.length} projects</p>
      <div className="project-list">
        {visible.map((project) => <ProjectProgressStack project={project} nameIndent={projectNameIndent(project, visible)} key={project.id} />)}
        {visible.length === 0 && <p>No projects match these filters.</p>}
      </div>
    </div>
  );
}
