"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { projectDashboardHref } from "../../lib/domain/project-dashboard";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { PlannedProgressTube } from "./planned-progress-tube";
import { summarizePlannedProgress } from "../../lib/domain/planned-progress";
import { ProjectAccordions } from "./project-accordions";
import { githubRepositoryUrl } from "../../lib/domain/portfolio-query";
import {ProjectLastUpdate} from '../projects/project-last-update';

export function ProjectProgressStack({
  project,
  nameIndent = 0
}: {
  project: PortfolioProjectOverview;
  nameIndent?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const progress = summarizePlannedProgress(project);
  const unmappedUnits = project.sourcePlan?.unmapped ?? 0;
  const mergedGitHubPrs = project.activity?.merged ?? 0;
  const unverifiedEvidence = Boolean(progress && unmappedUnits > 0);
  const contributingPackages=project.sourcePlan?.items.filter(item=>
    item.state==="in-progress" && (item.contributingNumbers?.length??0)>0).length??0;
  const missingPlanWithWork = !progress && mergedGitHubPrs > 0;
  const drawerId = useId();
  const aggregatorDeferred = ["FOIA_Bias_Analysis", "Send_FOIA_Log_Requests"]
    .some(name => project.repositoryFullName?.endsWith("/" + name));
  // The project bar always represents the whole current plan, including additions.
  const repositories = project.repositories.length > 0 ? project.repositories : [{
    id: `${project.id}-aggregate`,
    fullName: project.repositoryFullName ?? "Entire development plan",
    htmlUrl: project.repositoryUrl ?? "",
    completed: progress?.completed ?? 0,
    inProgress: progress?.inProgress ?? 0,
    planned: progress?.planned ?? 0,
    percent: progress?.percent ?? 0
  }];
  const isMultiRepository = repositories.length > 1;
  const allocated = !!progress &&
    repositories.reduce((total, repository) => total + repository.planned, 0) === progress.planned;

  return (
    <article className="project-progress-stack" data-hierarchy-depth={nameIndent}
      style={{ "--project-depth": nameIndent } as React.CSSProperties}>
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
          {progress ? `${progress.completed}/${progress.planned} planned` : aggregatorDeferred ? "Awaiting corpus" : "Plan unavailable"}
        </span>
        <span className="percentage" title={progress ? "Completed planned units divided by all planned units" : "No documented development plan"}>{progress ? `${progress.percent}%` : "N/A"}</span>
      </header>
      <ProjectLastUpdate update={project.latestUpdate}/>

      <div className="project-quick-links">
        {mergedGitHubPrs > 0 && <strong className="project-merged-count">{mergedGitHubPrs} GitHub PRs merged overall</strong>}
        <span className="project-activity">{unverifiedEvidence
          ? `${unmappedUnits} packages await accepted completion evidence · ${contributingPackages} show contributing PR activity · ${progress?.inProgress ?? 0} underway · ${progress?.completed ?? 0} accepted`
          : progress
            ? `${progress.notStarted} not started · ${progress.inProgress} underway · ${progress.completed} accepted`
            : missingPlanWithWork
              ? `Plan unverified · ${mergedGitHubPrs} GitHub PRs merged · progress not measurable`
              : aggregatorDeferred
                ? "Development deferred until FOIA Aggregator reaches broad source coverage"
                : "Source plan not yet verified"}</span>
        {progress?.inProgress ? <span className="project-open-count">{progress.inProgress} packages underway / awaiting acceptance</span> : null}
        {githubRepositoryUrl(project.repositoryFullName) && <a href={githubRepositoryUrl(project.repositoryFullName)} target="_blank" rel="noopener noreferrer">Open repository ↗</a>}
      </div>

      <div className="repository-progress-list" aria-label={`${project.displayName} repository progress`}>
        {isMultiRepository && progress && <div className="repository-progress-row planned-progress-aggregate-row">
          <span className="repository-progress-name">Full development plan</span>
          <PlannedProgressTube progress={progress} label={`${project.displayName} development plan progress`} />
          <span className="repository-pr-count">{progress.completed}/{progress.planned} planned</span>
          <span className="repository-percent">{progress.percent}%</span>
        </div>}
        {repositories.map((repository) => {
          const repositoryProgress = !isMultiRepository
            ? progress
            : allocated && repository.planned > 0
              ? summarizePlannedProgress({ planned: repository.planned,
                  completed: repository.completed, inProgress: repository.inProgress })
              : null;
          return <div className={`repository-progress-row${!isMultiRepository && progress ? " single-plan-progress-row" : ""}`} key={repository.id}>
            <span className="repository-progress-name">
              {githubRepositoryUrl(repository.fullName)
                ? <a href={githubRepositoryUrl(repository.fullName)} target="_blank" rel="noopener noreferrer">{repository.fullName}</a>
                : repository.fullName}
            </span>
            {repositoryProgress
              ? <PlannedProgressTube progress={repositoryProgress} label={isMultiRepository ? `${repository.fullName} roadmap progress` : `${project.displayName} development plan progress`} />
              : <span className="repository-unmeasured-plan" role="status"
                  aria-label={aggregatorDeferred ? "Implementation deferred pending FOIA corpus" : "Plan allocation not measured"}>
                  {aggregatorDeferred ? "Deferred: FOIA corpus" : "Not yet measured"}</span>}
            {(isMultiRepository || !progress) && <>
              <span className="repository-pr-count">{repositoryProgress
                ? `${repositoryProgress.completed}/${repositoryProgress.planned} planned`
                : "Plan allocation N/A"}</span>
              <span className="repository-percent">{repositoryProgress ? `${repositoryProgress.percent}%` : "—"}</span>
            </>}
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

