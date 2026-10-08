"use client";

import React, { useState } from "react";
import Link from "next/link";
import { projectDashboardHref } from "../../lib/domain/project-dashboard";
import type { PortfolioOverviewData } from "../../lib/domain/portfolio-overview";
import { defaultPortfolioQuery, githubRepositoryUrl, queryPortfolio } from "../../lib/domain/portfolio-query";
import { BrassPanel, GlassTube } from "../machine";
import { PortfolioControls } from "../portfolio/portfolio-controls";
import { LifecycleLanes } from "./lifecycle-lanes";

export function ProjectComparison({ overview }: { overview: PortfolioOverviewData }) {
  const [query, setQuery] = useState(defaultPortfolioQuery);
  const visible = queryPortfolio(overview.projects, query);
  return <BrassPanel title="Project comparison" eyebrow="Approved roadmap work">
    <LifecycleLanes projects={overview.projects} selectedStatus={query.status} onSelect={(status) => setQuery({ ...query, status })} />
    <PortfolioControls query={query} onChange={setQuery} />
    <p className="portfolio-result-count" aria-live="polite">Showing {visible.length} of {overview.projects.length} projects</p>
    {visible.length > 0 ? <div className="comparison-table-scroll" tabIndex={0} role="region" aria-label="Scrollable project comparison">
      <table className="comparison-table">
        <caption>Compare approved roadmaps and current lifecycle stages</caption>
        <thead><tr><th scope="col">Project</th><th scope="col">Lifecycle</th><th scope="col">Repositories</th><th scope="col">Approved PRs</th>
          <th scope="col">Merged</th><th scope="col">Underway</th><th scope="col">Remaining</th><th scope="col">Progress</th></tr></thead>
        <tbody>{visible.map((project) => <tr key={project.id}>
          <th scope="row"><strong><Link href={projectDashboardHref(project)}>{project.displayName}</Link></strong>{project.summary && <p>{project.summary}</p>}
            {githubRepositoryUrl(project.repositoryFullName) && <a href={githubRepositoryUrl(project.repositoryFullName)} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}</th>
          <td>{project.status.replaceAll("-", " ")}</td>
          <td>{project.repositories.length || (project.repositoryFullName ? 1 : 0)}</td>
          <td>{project.planned || "No approved plan"}</td><td>{project.completed}</td><td>{project.inProgress}</td><td>{project.planned - project.completed}</td>
          <td>{project.planned > 0 ? <><GlassTube label={`${project.displayName} comparison progress`} value={project.completed} max={project.planned}
            state={project.completed === project.planned ? "complete" : "active"} size="compact" /><span>{project.percent}%</span></> : "Not measured"}</td>
        </tr>)}</tbody>
      </table>
    </div> : <p className="portfolio-empty-state">{overview.source === "error" ? "Portfolio data is unavailable. Refresh to try again." : overview.projects.length === 0 ? "No registered projects are available to compare yet." : "No projects match these filters."}</p>}
    <p className="portfolio-calculation-note">Progress measures approved roadmap work. A lifecycle stage such as live or beta remains a separate signal.</p>
  </BrassPanel>;
}
