import type { ProjectStatus } from "./portfolio";
import type { ProjectFeature } from "./project-features";
import type { ProjectActivitySummary,PullRequestReadout,SourcePlanSummary } from './live-monitor';

export type PortfolioRepositoryProgress = {
  id: string;
  fullName: string;
  htmlUrl: string;
  completed: number;
  inProgress: number;
  planned: number;
  percent: number;
};

export type PortfolioProjectOverview = {
  id: string;
  displayName: string;
  slug?: string;
  summary?: string;
  status: ProjectStatus;
  repositoryFullName?: string;
  repositoryUrl?: string;
  completed: number;
  inProgress: number;
  planned: number;
  percent: number;
  repositories: PortfolioRepositoryProgress[];
  features?: ProjectFeature[];
  activity?: ProjectActivitySummary;
  pullRequests?: PullRequestReadout[];
  sourcePlan?: SourcePlanSummary;
  completionMeasured?: boolean;
};

export type PortfolioStatistics = {
  projects: number;
  activeProjects: number;
  completedRoadmapPrs: number;
  plannedRoadmapPrs: number;
  percent: number;
};

export type PortfolioOverviewData = {
  source: "database" | "unconfigured" | "error";
  projects: PortfolioProjectOverview[];
  statistics: PortfolioStatistics;
};
