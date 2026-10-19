"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { projectDashboardHref } from "../../lib/domain/project-dashboard";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { PlannedProgressTube } from "./planned-progress-tube";
import { summarizePlannedProgress } from "../../lib/domain/planned-progress";
import { ProjectAccordions } from "./project-accordions";
import { githubRepositoryUrl } from "../../lib/domain/portfolio-query";
import {DependencyReadout} from "../projects/dependency-readiness";
import {PrFacts} from "../projects/pr-facts";
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
  const reviews=project.sourcePlan?.items.flatMap(item=>item.implementationReview?[item.implementationReview]:[])??[];
  const implemented=reviews.filter(r=>r.implementation==='implemented').length;
  const remainingSoftware=reviews.length-implemented;
  const unreviewed=(project.sourcePlan?.items.length??0)-reviews.length;
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
      </header>
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
            <>
              <span className="repository-pr-count">{repositoryProgress
                ? `${repositoryProgress.completed}/${repositoryProgress.planned} planned`
                : "Plan allocation N/A"}</span>
              <span className="repository-percent">{repositoryProgress ? `${repositoryProgress.percent}%` : "—"}</span>
            </>
          </div>;
        })}
      </div>

      {reviews.length>0&&<p className="source-implementation-summary">Source implementation review: {implemented} software units implemented · {remainingSoftware} with specific software work remaining · {unreviewed} without an implementation review. Release inputs and deployment are tracked separately.</p>}
      <PrFacts summary={project.prSummary} repository={project.repositoryFullName} planned={progress?.planned ?? null}/>
      <DependencyReadout data={project.dependencyReadiness}/>
      <ProjectLastUpdate update={project.latestUpdate}/>
      <details className="planning-details"><summary>Planning records · {progress ? `${progress.completed}/${progress.planned} packages mapped to merged PRs` : "plan unavailable"}</summary>
      {project.planReconciliation&&<p>{project.planReconciliation.mergedUnlinked} accepted merged PRs have no current planning link · {project.planReconciliation.mergedContributions} accepted merged PRs contribute to larger packages. Missing links are reconciliation work, not evidence that implementation never began.</p>}
      <p>Planning mappings are not an estimate of how much of the application is finished. Unmapped work requires reconciliation; upstream and deployment readiness are separate.</p>

      <div className="project-quick-links">
        {mergedGitHubPrs > 0 && <strong className="project-merged-count">{mergedGitHubPrs} GitHub PRs accepted (merged)</strong>}
        <span className="project-activity">{unverifiedEvidence
          ? `${unmappedUnits} packages lack a verified full-scope merge mapping · ${progress?.inProgress ?? 0} have PR activity · ${progress?.completed ?? 0} mapped to merged PRs`
          : progress
            ? `${progress.notStarted} without a full-scope merge mapping · ${progress.inProgress} with PR activity · ${progress.completed} mapped to merged PRs`
            : missingPlanWithWork
              ? `Plan unverified · ${mergedGitHubPrs} GitHub PRs accepted (merged) · package progress not measurable`
              : aggregatorDeferred
                ? "Development deferred until FOIA Aggregator reaches broad source coverage"
                : "Source plan not yet verified"}</span>
        {progress?.inProgress ? <span className="project-open-count">{progress.inProgress} packages with linked PR activity</span> : null}
        {githubRepositoryUrl(project.repositoryFullName) && <a href={githubRepositoryUrl(project.repositoryFullName)} target="_blank" rel="noopener noreferrer">Open repository ↗</a>}
      </div>


      </details>
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

