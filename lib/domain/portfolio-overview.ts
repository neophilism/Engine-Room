import type { PullRequestCounts, RepositoryPrActivity } from "./repository-pr-activity";
import type { ProjectStatus } from "./portfolio";
import type { ProjectFeature } from "./project-features";

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
  /** Every GitHub PR observed for the linked repositories. */
  repositoryActivity?: RepositoryPrActivity;
  /** PRs excluded from fully-mapped approved roadmap units. */
  additionalActivity?: PullRequestCounts;
  roadmapMappingComplete?: boolean;
  features?: ProjectFeature[];
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
