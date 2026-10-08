import { getRuntimeConfig, type EnvironmentSource } from "../config/env";
import { getDatabasePool } from "./database";

export type PublicGitHubStatus = {
  source: "database" | "unconfigured" | "error";
  repositoryCount: number | null;
  pullRequestCount: number | null;
  mergedPullRequestCount: number | null;
  mostRecentObservation: string | null;
};

type ObservationRow = {
  repo_count: number | string;
  pr_count: number | string;
  merged_count: number | string;
  latest_observation: Date | null;
};

export function normalizePublicGitHubObservation(row: ObservationRow): PublicGitHubStatus {
  const counts = [row.repo_count, row.pr_count, row.merged_count].map(Number);
  if (!counts.every(value => Number.isSafeInteger(value) && value >= 0) ||
      counts[2] > counts[1]) throw new Error("Invalid persisted GitHub counts.");
  return {
    source: "database",
    repositoryCount: counts[0],
    pullRequestCount: counts[1],
    mergedPullRequestCount: counts[2],
    mostRecentObservation: row.latest_observation ? new Date(row.latest_observation).toISOString() : null
  };
}

const unavailable = (source: "unconfigured" | "error"): PublicGitHubStatus =>
  ({ source, repositoryCount: null, pullRequestCount: null, mergedPullRequestCount: null, mostRecentObservation: null });

export async function loadPublicGitHubStatus(env: EnvironmentSource = process.env): Promise<PublicGitHubStatus> {
  if (!getRuntimeConfig(env).databaseUrl) return unavailable("unconfigured");
  try {
    const owner = env.ENGINE_ROOM_GITHUB_OWNER?.trim() || "neophilism";
    const result = await getDatabasePool(env).query<ObservationRow>(
      `select
        count(distinct r.id)::integer as repo_count,
        count(gpr.id)::integer as pr_count,
        count(gpr.id) filter (where gpr.merged_at is not null)::integer as merged_count,
        max(gpr.last_synced_at) as latest_observation
       from repositories r
       left join github_pull_requests gpr on gpr.repository_id = r.id
       where r.visibility = 'public' and lower(r.owner_login) = lower($1)`,
      [owner]
    );
    if (!result.rows[0]) return unavailable("error");
    return normalizePublicGitHubObservation(result.rows[0]);
  } catch {
    return unavailable("error");
  }
}
