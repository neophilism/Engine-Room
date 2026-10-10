import type { SourcePlanSummary,PullRequestReadout } from "./live-monitor";
import type { DevelopmentPlanGraph, Project, Repository, RoadmapProgress } from "./portfolio";
import type { MilestoneProgress } from "./milestone-lifecycle";
import type { PortfolioOverviewData } from "./portfolio-overview";
import type { ProjectFeature } from "./project-features";
import type { DevelopmentActivity } from "./development-activity";
import type { ProjectReadiness } from "./project-readiness";

export type ProjectDashboardData = {
  source: PortfolioOverviewData["source"];
  project: Project | null;
  repositories: Repository[];
  graph?: DevelopmentPlanGraph;
  progress?: RoadmapProgress;
  completionMeasured?: boolean;
  unverifiedRoadmapItems?: number;
  milestones: MilestoneProgress[];
  features?: ProjectFeature[];
  activities?: DevelopmentActivity[];
  readiness?: ProjectReadiness;
  sourcePlan?: SourcePlanSummary;
  pullRequests?: PullRequestReadout[];
};

export function projectDashboardHref(project: { id: string; slug?: string }) {
  return `/projects/${encodeURIComponent(project.slug ?? project.id)}`;
}
