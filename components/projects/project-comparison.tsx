"use client";

import { projectNameIndent } from "../../lib/domain/project-hierarchy";

import React, { useState } from "react";
import Link from "next/link";
import { projectDashboardHref } from "../../lib/domain/project-dashboard";
import type { PortfolioOverviewData } from "../../lib/domain/portfolio-overview";
import { defaultPortfolioQuery, githubRepositoryUrl, queryPortfolio } from "../../lib/domain/portfolio-query";
import { BrassPanel } from "../machine";
import { PlannedProgressTube } from "../portfolio/planned-progress-tube";
import { summarizePlannedProgress } from "../../lib/domain/planned-progress";
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
        <thead><tr><th scope="col">Project</th><th scope="col">Lifecycle</th><th scope="col">Repositories</th><th scope="col">Planned PRs</th>
          <th scope="col">Completed</th><th scope="col">Remaining</th><th scope="col">Progress</th></tr></thead>
        <tbody>{visible.map((project) => {
          const progress = summarizePlannedProgress(project);
          return <tr key={project.id}>
          <th scope="row"><strong className={projectNameIndent(project, visible) > 0 ? "project-name-indent" : undefined}><Link href={projectDashboardHref(project)}>{project.displayName}</Link></strong>{project.summary && <p>{project.summary}</p>}
            {githubRepositoryUrl(project.repositoryFullName) && <a href={githubRepositoryUrl(project.repositoryFullName)} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}</th>
          <td>{project.status.replaceAll("-", " ")}</td>
          <td>{project.repositories.length || (project.repositoryFullName ? 1 : 0)}</td>
          <td>{progress?.planned ?? "N/A"}</td>
          <td>{progress?.completed ?? "—"}</td>
          <td>{progress?.remaining ?? "—"}</td>
          <td>{progress
            ? <><PlannedProgressTube compact label={`${project.displayName} comparison progress`} progress={progress} /><span>{progress.percent}%</span></>
            : "N/A"}</td>
        </tr>})}</tbody>
      </table>
    </div> : <p className="portfolio-empty-state">{overview.source === "error" ? "Portfolio data is unavailable. Refresh to try again." : overview.projects.length === 0 ? "No registered projects are available to compare yet." : "No projects match these filters."}</p>}
    <p className="portfolio-calculation-note">Progress is completed planned units divided by all planned units in the development plan, even if most planned PRs have not been opened or mapped. Green is original work; amber is documented added work.</p>
  </BrassPanel>;
}
