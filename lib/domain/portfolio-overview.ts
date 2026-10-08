import type { ProjectStatus } from "./portfolio";

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
