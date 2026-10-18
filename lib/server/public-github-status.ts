export type RepositoryGitHubStatus = {
  name: string;
  merged: number;
  total: number;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  error: string | null;
  planSource: "repository" | "bundled" | "missing";
  visibility: "private" | "public";
};

import {pollingMinutes} from "../domain/source-freshness";
import { getRuntimeConfig, type EnvironmentSource } from "../config/env";
import { getDatabasePool } from "./database";

export type PublicGitHubStatus = {
  source: "database" | "unconfigured" | "error";
  repositoryCount: number | null;
  pullRequestCount: number | null;
  mergedPullRequestCount: number | null;
  mostRecentObservation: string | null;
  repositories?: RepositoryGitHubStatus[];
  githubCredentialConfigured?: boolean;
  observationId?:string;
  checkedAt?:string;
  pollingMinutes?:number;
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

export async function loadPublicGitHubStatus(env: EnvironmentSource = process.env, sharedClient?:import("pg").PoolClient): Promise<PublicGitHubStatus> {
  if (!getRuntimeConfig(env).databaseUrl) return unavailable("unconfigured");
  try {
    const owner = env.ENGINE_ROOM_GITHUB_OWNER?.trim() || "neophilism";
    const result = await (sharedClient??getDatabasePool(env)).query<ObservationRow>(
      `select
        count(distinct r.id)::integer as repo_count,
        count(gpr.id)::integer as pr_count,
        count(gpr.id) filter (where gpr.merged_at is not null)::integer as merged_count,
        max(gpr.last_synced_at) as latest_observation
       from repositories r
       left join github_pull_requests gpr on gpr.repository_id = r.id
       where lower(r.owner_login) = lower($1) and not r.archived`,
      [owner]
    );
    if (!result.rows[0]) return unavailable("error");
    const authenticated=Boolean(env.GITHUB_READ_TOKEN?.trim()||env.GITHUB_APP_ID&&env.GITHUB_APP_PRIVATE_KEY&&env.GITHUB_INSTALLATION_ID);
    const controls=await (sharedClient??getDatabasePool(env)).query("SELECT github_reconciliation_interval_minutes FROM engine_room_control_settings WHERE singleton=true");
    const status={...normalizePublicGitHubObservation(result.rows[0]),checkedAt:new Date().toISOString(),pollingMinutes:pollingMinutes(authenticated,Number(controls.rows[0]?.github_reconciliation_interval_minutes??15))};
    // Expose source provenance and actual GitHub refresh time for every repo.
    // This is read-only, and contains no provider tokens or private materials.
    try {
      const rows=await (sharedClient??getDatabasePool(env)).query<{
        name:string; visibility:"public"|"private"; merged:string|number; total:string|number;
        last_success_at:Date|null;last_attempt_at:Date|null;last_error:string|null;source_ref:string|null
      }>(`select r.name,r.visibility,
        count(g.id)::integer as total,
        count(g.id) filter(where g.merged_at is not null)::integer as merged,
        s.last_success_at,s.last_attempt_at,s.last_error,
        (select d.source_ref from project_plan_documents d
         where d.repository_id=r.id and d.path='registry/prs.json'
         order by case when d.path='registry/prs.json' then 0 else 1 end, d.version_id desc limit 1) as source_ref
       from repositories r
       left join github_repository_sync s on s.repository_id=r.id
       left join github_pull_requests g on g.repository_id=r.id
       where lower(r.owner_login)=lower($1) and not r.archived
       group by r.id,s.last_success_at,s.last_attempt_at,s.last_error
       order by r.name`,[owner]);
      return {...status,githubCredentialConfigured:Boolean(env.GITHUB_READ_TOKEN?.trim() ||
        env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY && env.GITHUB_INSTALLATION_ID),repositories:rows.rows.map(r=>({
        name:r.name,visibility:r.visibility,merged:Number(r.merged),total:Number(r.total),
        lastSuccessAt:r.last_success_at?new Date(r.last_success_at).toISOString():null,
        lastAttemptAt:r.last_attempt_at?new Date(r.last_attempt_at).toISOString():null,
        error:r.last_error,planSource:r.source_ref?
          r.source_ref.startsWith('bundled:')?'bundled' as const:'repository' as const:'missing' as const
      }))};
    } catch { return status; }
  } catch {
    return unavailable("error");
  }
}

