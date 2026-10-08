"use client";

import React, { useId, useState } from "react";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { GlassTube } from "../machine";
import { ProjectAccordions } from "./project-accordions";

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
        <strong>{project.displayName}</strong>
        <span className="count">
          {project.completed}/{project.planned} PRs
        </span>
        <span className="percentage">{project.percent}%</span>
      </header>

      <div
        className="repository-progress-list"
        aria-label={`${project.displayName} repository progress`}
      >
        {repositories.map((repository) => (
          <div className="repository-progress-row" key={repository.id}>
            <span className="repository-progress-name">
              {repository.fullName}
            </span>
            <GlassTube
              value={repository.completed}
              max={Math.max(repository.planned, 1)}
              label={`${repository.fullName} roadmap progress`}
              state={progressState(
                repository.completed,
                repository.inProgress,
                repository.planned
              )}
              showScale
            />
            <span className="repository-pr-count">
              {repository.completed}/{repository.planned} PRs
            </span>
            <span className="repository-percent">{repository.percent}%</span>
          </div>
        ))}
      </div>

      <div
        id={drawerId}
        className={`project-expansion-drawer${expanded ? " open" : ""}`}
        aria-hidden={!expanded}
      >
        <div className="project-expansion-inner">
          <ProjectAccordions project={project} />
        </div>
      </div>
    </article>
  );
}
