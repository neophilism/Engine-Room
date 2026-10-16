/** GitHub merge history as last observed by Engine Room's manual source sync. */
export type VelocityDay = { day: string; merges: number };
export type VelocityProject = {
  id: string;
  name: string;
  repositories: string[];
  days: VelocityDay[];
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
