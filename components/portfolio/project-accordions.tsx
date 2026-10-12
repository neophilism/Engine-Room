import React from "react";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { SourcePlan } from "../projects/source-plan";
import { ProjectFeatures } from "../projects/project-features";
import {projectDashboardHref} from '../../lib/domain/project-dashboard';
import { summarizePlannedProgress } from "../../lib/domain/planned-progress";

export function ProjectAccordions({
  project
}: {
  project: PortfolioProjectOverview;
}) {
  const repositoryCount = project.repositories.length || (project.repositoryFullName ? 1 : 0);
  const progress = summarizePlannedProgress(project);

  return (
    <div className="project-accordions">
      <details className="project-accordion" open>
        <summary>Summary</summary>
        <div className="project-accordion-body">
          <p>
            {project.summary?.trim() ||
              "No project summary has been registered yet."}
          </p>
          {project.repositoryFullName && <small>Summary from the repository’s GitHub About description.</small>}
        </div>
      </details>

      <details className="project-accordion"><summary>Original roadmap and added work</summary><div className="project-accordion-body"><SourcePlan plan={project.sourcePlan} historyHref={projectDashboardHref(project)+'/plans'}/></div></details>
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
              <dt>Planned work complete</dt>
              <dd>{progress ? `${progress.completed}/${progress.planned}` : "N/A"}</dd>
            </div>
            <div>
              <dt>PRs remaining</dt>
              <dd>{progress?.remaining ?? "N/A"}</dd>
            </div>
          </dl>
        </div>
      </details>
    </div>
  );
}

