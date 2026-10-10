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

export function ProjectComparison({ overview }: { overview: PortfolioOverviewData }) {
  const [query, setQuery] = useState(defaultPortfolioQuery);
  const visible = queryPortfolio(overview.projects, query);

  return (
    <BrassPanel title="Projects" eyebrow="Portfolio">
      <PortfolioControls query={query} onChange={setQuery} />
      <p className="portfolio-result-count" aria-live="polite">
        Showing {visible.length} of {overview.projects.length} projects
      </p>
      {visible.length > 0 ? (
        <div className="comparison-table-scroll" tabIndex={0} role="region"
          aria-label="Scrollable project comparison">
          <table className="comparison-table">
            <caption>Project stages and progress against documented development plans</caption>
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Stage</th>
                <th scope="col">Plan work</th>
                <th scope="col">Progress</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((project) => {
                const progress = summarizePlannedProgress(project);
                return (
                  <tr key={project.id}>
                    <th scope="row">
                      <div className="comparison-project-name">
                        <strong className={projectNameIndent(project, visible) > 0 ?
                          "project-name-indent" : undefined}>
                          <Link href={projectDashboardHref(project)}>{project.displayName}</Link>
                        </strong>
                        {githubRepositoryUrl(project.repositoryFullName) &&
                          <a className="comparison-github-link" href={githubRepositoryUrl(project.repositoryFullName)}
                            target="_blank" rel="noopener noreferrer"
                            aria-label={`Open ${project.displayName} on GitHub`} title="GitHub repository">
                            ↗
                          </a>}
                      </div>
                      {project.summary && <p title={project.summary}>{project.summary}</p>}
                    </th>
                    <td><span className="comparison-stage">{project.status.replaceAll("-", " ")}</span></td>
                    <td className="comparison-work-count">
                      {progress ?
                        <><strong>{progress.completed}/{progress.planned}</strong>
                          <small>{progress.remaining} remaining</small>
                          {progress.inProgress>0 && <small className="project-open-count">{progress.inProgress} open / unmerged</small>}</>
                        : <span className="comparison-not-measured">N/A</span>}
                    </td>
                    <td className="comparison-progress-cell">
                      {progress ?
                        <div className="comparison-progress">
                          <PlannedProgressTube compact label={`${project.displayName} comparison progress`}
                            progress={progress} />
                          <strong>{progress.percent}%</strong>
                        </div>
                        : <span className="comparison-not-measured">N/A</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="portfolio-empty-state">
          {overview.source === "error" ?
            "Portfolio data is unavailable. Refresh to try again." :
            overview.projects.length === 0 ?
              "No registered projects are available to compare yet." :
              "No projects match these filters."}
        </p>
      )}
      <p className="portfolio-calculation-note">
        <span className="planned-progress-legend">
          <span className="merged">Green: merged</span>
          <span className="underway">Yellow: open / unmerged</span>
          <span className="unstarted">Empty: not started</span>
        </span>
        All planned work, including additions, shares the same denominator.
        An open PR counts yellow regardless of whether its tests are still running or already passing.
      </p>
    </BrassPanel>
  );
}
