import React from "react";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { ProjectFeatures } from "../projects/project-features";

export function ProjectAccordions({
  project
}: {
  project: PortfolioProjectOverview;
}) {
  const repositoryCount = project.repositories.length || (project.repositoryFullName ? 1 : 0);

  return (
    <div className="project-accordions">
      <details className="project-accordion" open>
        <summary>Summary</summary>
        <div className="project-accordion-body">
          <p>
            {project.summary?.trim() ||
              "No project summary has been registered yet."}
          </p>
        </div>
      </details>

      <details className="project-accordion">
        <summary>Features</summary>
        <div className="project-accordion-body">
          <ProjectFeatures features={project.features ?? []} />
        </div>
      </details>

      <details className="project-accordion">
        <summary>At a Glance</summary>
        <div className="project-accordion-body">
          <dl className="project-at-a-glance">
            <div>
              <dt>Lifecycle</dt>
              <dd>{project.status}</dd>
            </div>
            <div>
              <dt>Repositories</dt>
              <dd>{repositoryCount}</dd>
            </div>
            <div>
              <dt>PRs underway</dt>
              <dd>{project.inProgress}</dd>
            </div>
            <div>
              <dt>PRs remaining</dt>
              <dd>{Math.max(project.planned - project.completed, 0)}</dd>
            </div>
          </dl>
        </div>
      </details>
    </div>
  );
}
