"use client";

import React, { useState } from "react";
import { projectStatuses, type ProjectStatus } from "../../lib/domain/portfolio";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { defaultPortfolioQuery, queryPortfolio, type PortfolioSort } from "../../lib/domain/portfolio-query";
import { ProjectProgressStack } from "./project-progress-stack";

export function PortfolioBrowser({ projects }: { projects: readonly PortfolioProjectOverview[] }) {
  const [query, setQuery] = useState(defaultPortfolioQuery);
  const visible = queryPortfolio(projects, query);
  const filtered = query.search.trim() !== "" || query.status !== "all";

  return (
    <div>
      <form className="portfolio-controls" role="search" aria-label="Filter portfolio" onSubmit={(event) => event.preventDefault()}>
        <label>Search projects
          <input type="search" value={query.search} placeholder="Project, feature, or repository"
            onChange={(event) => setQuery({ ...query, search: event.target.value })} />
        </label>
        <label>Lifecycle
          <select value={query.status} onChange={(event) => setQuery({ ...query, status: event.target.value as ProjectStatus | "all" })}>
            <option value="all">All stages</option>
            {projectStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("-", " ")}</option>)}
          </select>
        </label>
        <label>Sort projects
          <select value={query.sort} onChange={(event) => setQuery({ ...query, sort: event.target.value as PortfolioSort })}>
            <option value="portfolio">Portfolio order</option><option value="name">Name</option>
            <option value="completion-desc">Most complete</option><option value="completion-asc">Least complete</option>
            <option value="underway">Most PRs underway</option>
          </select>
        </label>
        {filtered && <button className="portfolio-control-button" type="button" onClick={() => setQuery(defaultPortfolioQuery)}>Clear filters</button>}
      </form>
      <p className="portfolio-result-count" aria-live="polite">Showing {visible.length} of {projects.length} projects</p>
      <div className="project-list">
        {visible.map((project) => <ProjectProgressStack project={project} key={project.id} />)}
        {visible.length === 0 && <p>No projects match these filters.</p>}
      </div>
    </div>
  );
}
