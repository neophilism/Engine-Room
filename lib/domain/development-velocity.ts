/** GitHub merge history as last observed by Engine Room's manual source sync. */
export type VelocityDay = { day: string; merges: number };
export type VelocityLifetime = {
  /** Effective first day for this project: latest of its GitHub creation and current development-wave launch. */
  startedOn: string | null;
  /** Merges since the current development-wave launch, including those outside the 365-day graph window. */
  mergedPrs: number;
  /** A launch-window value means an older repository's initial date was clamped to the new development wave. */
  startSource: "github" | "first-pr" | "launch-window" | "unavailable";
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
