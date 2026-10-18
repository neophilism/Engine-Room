import type { ProjectStatus } from "./portfolio";
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
  dependencyReadiness?: import("./dependency-readiness").ProjectDependencies;
  prSummary?: import("./pr-summary").PullRequestSummary;
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
  observationId?: string; checkedAt?:string;
  reconciliation?:{id:string;status:string;requested:number;completed:number;deferred:number;publishedAt:string|null};
};

