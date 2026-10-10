"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { projectDashboardHref } from "../../lib/domain/project-dashboard";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { PlannedProgressTube } from "./planned-progress-tube";
import { summarizePlannedProgress } from "../../lib/domain/planned-progress";
import { ProjectAccordions } from "./project-accordions";
import { githubRepositoryUrl } from "../../lib/domain/portfolio-query";

export function ProjectProgressStack({
  project,
  nameIndent = 0
}: {
  project: PortfolioProjectOverview;
  nameIndent?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const progress = summarizePlannedProgress(project);
  const drawerId = useId();
  const aggregatorDeferred = ["FOIA_Bias_Analysis", "Send_FOIA_Log_Requests"]
    .some(name => project.repositoryFullName?.endsWith("/" + name));
  // A source plan can be documented even though the older approved-PR allocation
  // table has no rows yet. For a one-repo project, show the full sourced plan
  // instead of rendering a second misleading "Plan allocation N/A" row.
  const repositories = project.repositories.length === 1 && progress && project.repositories[0].planned === 0
    ? [{ ...project.repositories[0], planned: progress.original.planned, completed: progress.original.completed,
         percent: progress.original.planned ? 100 * progress.original.completed / progress.original.planned : 0 }]
    : project.repositories.length > 0 ? project.repositories : [{
    id: `${project.id}-aggregate`,
    fullName: project.repositoryFullName ?? "Entire development plan",
    htmlUrl: project.repositoryUrl ?? "",
    completed: progress?.original.completed ?? 0,
    inProgress: 0,
    planned: progress?.original.planned ?? 0,
    percent: progress?.original.planned
      ? 100 * (progress.original.completed / progress.original.planned) : 0
  }];
  // If only ten of 100 planned items have repository mappings, a 9/10
  // repository tube would be misleading. Show the 9/100 plan tube instead.
  const allocated = !!progress &&
    repositories.reduce((total, repository) => total + repository.planned, 0) === progress.original.planned;
  const showAggregate = !!progress && (repositories.length > 1 || !allocated);


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
        <strong className={nameIndent > 0 ? "project-name-indent" : undefined}><Link href={projectDashboardHref(project)}>{project.displayName}</Link></strong>
        <span className="count">
          {progress ? `${progress.completed}/${progress.planned} planned` : aggregatorDeferred ? "Awaiting corpus" : "Plan unavailable"}
        </span>
        <span className="percentage" title={progress ? "Completed planned units divided by all planned units" : "No documented development plan"}>{progress ? `${progress.percent}%` : "N/A"}</span>
      </header>

      <div className="project-quick-links">
        <span className="project-activity">{progress
          ? `${progress.remaining} of ${progress.planned} planned items remaining`
          : aggregatorDeferred ? "Development deferred until FOIA Aggregator reaches broad source coverage" : "Source plan not yet verified"}</span>
        {progress?.added.planned ? <span className="planned-progress-legend">
          <span className="original">Original {progress.original.completed}/{progress.original.planned}</span>
          <span className="added">Added {progress.added.completed}/{progress.added.planned}</span>
        </span> : null}
        {githubRepositoryUrl(project.repositoryFullName) && <a href={githubRepositoryUrl(project.repositoryFullName)} target="_blank" rel="noopener noreferrer">Open repository ↗</a>}
      </div>

      <div className="repository-progress-list" aria-label={`${project.displayName} repository progress`}>
        {showAggregate && progress && <div className="repository-progress-row planned-progress-aggregate-row">
          <span className="repository-progress-name">Full development plan</span>
          <PlannedProgressTube progress={progress} label={`${project.displayName} development plan progress`} />
          <span className="repository-pr-count">{progress.completed}/{progress.planned} planned</span>
          <span className="repository-percent">{progress.percent}%</span>
        </div>}
        {repositories.map((repository) => {
          const repositoryProgress = allocated && progress && repository.planned > 0
            ? repositories.length === 1
              ? progress
              : summarizePlannedProgress({ planned: repository.planned, completed: repository.completed })
            : null;
          return <div className="repository-progress-row" key={repository.id}>
            <span className="repository-progress-name">
              {githubRepositoryUrl(repository.fullName)
                ? <a href={githubRepositoryUrl(repository.fullName)} target="_blank" rel="noopener noreferrer">{repository.fullName}</a>
                : repository.fullName}
            </span>
            {repositoryProgress
              ? <PlannedProgressTube progress={repositoryProgress} label={`${repository.fullName} roadmap progress`} />
              : <span className="repository-unmeasured-plan" role="status"
                  aria-label={aggregatorDeferred ? "Implementation deferred pending FOIA corpus" : "Plan allocation not measured"}>
                  {aggregatorDeferred ? "Deferred: FOIA corpus" : "Not yet measured"}</span>}
            <span className="repository-pr-count">{repositoryProgress
              ? `${repositoryProgress.completed}/${repositoryProgress.planned} planned`
              : "Plan allocation N/A"}</span>
            <span className="repository-percent">{repositoryProgress ? `${repositoryProgress.percent}%` : "—"}</span>
          </div>;
        })}
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
