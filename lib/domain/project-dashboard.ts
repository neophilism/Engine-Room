import type { DevelopmentPlanGraph, Project, Repository, RoadmapProgress } from "./portfolio";
import type { MilestoneProgress } from "./milestone-lifecycle";
import type { PortfolioOverviewData } from "./portfolio-overview";
import type { ProjectFeature } from "./project-features";

export type ProjectDashboardData = {
  source: PortfolioOverviewData["source"];
  project: Project | null;
  repositories: Repository[];
  graph?: DevelopmentPlanGraph;
  progress?: RoadmapProgress;
  milestones: MilestoneProgress[];
  features?: ProjectFeature[];
};

export function projectDashboardHref(project: { id: string; slug?: string }) {
  return `/projects/${encodeURIComponent(project.slug ?? project.id)}`;
}
