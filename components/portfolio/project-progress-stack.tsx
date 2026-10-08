"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { projectDashboardHref } from "../../lib/domain/project-dashboard";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { GlassTube } from "../machine";
import { ProjectAccordions } from "./project-accordions";
import { githubRepositoryUrl } from "../../lib/domain/portfolio-query";

function progressState(completed: number, inProgress: number, planned: number) {
  if (planned > 0 && completed === planned) return "complete" as const;
  if (inProgress > 0) return "active" as const;
  return "live" as const;
}

export function ProjectProgressStack({
  project
}: {
  project: PortfolioProjectOverview;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasApprovedPlan = project.planned > 0;
  const drawerId = useId();
  const repositories =
    project.repositories.length > 0
      ? project.repositories
      : [
          {
            id: `${project.id}-aggregate`,
            fullName: project.repositoryFullName ?? "Unassigned roadmap units",
            htmlUrl: project.repositoryUrl ?? "",
            completed: project.completed,
            inProgress: project.inProgress,
            planned: project.planned,
            percent: project.percent
          }
        ];

  return (
    <article className="project-progress-stack">
      <header className="project-progress-heading">
        <button
          className="disclosure"
          aria-label={`${expanded ? "Collapse" : "Expand"} ${project.displayName}`}
          aria-expanded={expanded}
          aria-controls={drawerId}
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <span
            className={`disclosure-arrow${expanded ? " expanded" : ""}`}
            aria-hidden="true"
          >
            ▶
          </span>
        </button>
        <strong><Link href={projectDashboardHref(project)}>{project.displayName}</Link></strong>
        <span className="count">
          {hasApprovedPlan ? `${project.completed}/${project.planned} PRs` : "Approved plan not mapped"}
        </span>
        <span className="percentage">{hasApprovedPlan ? `${project.percent}%` : "Not measured"}</span>
      </header>

      <div className="project-quick-links">
        <span className="project-activity">{!hasApprovedPlan ? "No approved roadmap mapping yet — repository activity is available separately" : project.inProgress > 0 ? `${project.inProgress} roadmap PR${project.inProgress === 1 ? "" : "s"} underway` : "No roadmap PRs underway"}</span>
        {githubRepositoryUrl(project.repositoryFullName) && <a href={githubRepositoryUrl(project.repositoryFullName)} target="_blank" rel="noopener noreferrer">Open repository ↗</a>}
      </div>

      <div
        className="repository-progress-list"
        aria-label={`${project.displayName} repository progress`}
      >
        {repositories.map((repository) => (
          <div className="repository-progress-row" key={repository.id}>
            <span className="repository-progress-name">
              {githubRepositoryUrl(repository.fullName)
                ? <a href={githubRepositoryUrl(repository.fullName)} target="_blank" rel="noopener noreferrer">{repository.fullName}</a>
                : repository.fullName}
            </span>
            {hasApprovedPlan ? <GlassTube
              value={repository.completed}
              max={Math.max(repository.planned, 1)}
              label={`${repository.fullName} roadmap progress`}
              state={progressState(repository.completed, repository.inProgress, repository.planned)}
              showScale
            /> : <span className="repository-unmeasured" aria-label={`${repository.fullName} unmeasured roadmap`}>Roadmap not measured</span>}
            <span className="repository-pr-count">
              {hasApprovedPlan ? `${repository.completed}/${repository.planned} PRs` : "No approved mapping"}
            </span>
            <span className="repository-percent">{hasApprovedPlan ? `${repository.percent}%` : "—"}</span>
          </div>
        ))}
      </div>

      <div
        id={drawerId}
        className={`project-expansion-drawer${expanded ? " open" : ""}`}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className="project-expansion-inner">
          <ProjectAccordions project={project} />
        </div>
      </div>
    </article>
  );
}
