import type { ProjectStatus } from "./portfolio";
import type { TimeForecast } from "./time-completion";
import type {ProjectUpdate} from './project-update';
import type {RepositorySecurityStatus} from './security-status';
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
  timeForecast?: TimeForecast;
};

export type PortfolioProjectOverview = {
  id: string;
  displayName: string;
  slug?: string;
  summary?: string;
  latestUpdate?: ProjectUpdate;
  securityStatuses?:RepositorySecurityStatus[];
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
  timeForecast?: TimeForecast;
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

