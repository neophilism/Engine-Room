/** GitHub merge history as last observed by Engine Room's manual source sync. */
export type VelocityDay = { day: string; merges: number };
export type VelocityLifetime = {
  /** Earliest actual GitHub repository creation day across this project's repositories. */
  startedOn: string | null;
  /** All recorded merges, including those outside the 365-day graph window. */
  mergedPrs: number;
  /** GitHub repo creation preferred; first PR creation is a documented fallback. */
  startSource: "github" | "first-pr" | "unavailable";
  undatedRepositories: number;
};
export type VelocityProject = {
  id: string;
  name: string;
  repositories: string[];
  days: VelocityDay[];
  lifetime: VelocityLifetime;
};
export type DevelopmentVelocityData = {
  source: "database" | "unconfigured" | "error";
  projects: VelocityProject[];
  boardroomStartDate: string | null;
  observedAt: string;
  latestSuccessfulSyncAt: string | null;
  oldestSuccessfulSyncAt: string | null;
  trackedRepositories: number;
  synchronizedRepositories: number;
};
export type VelocityStatistics = {
  last7: number;
  previous7: number;
  last28: number;
  changePercent: number | null;
};
