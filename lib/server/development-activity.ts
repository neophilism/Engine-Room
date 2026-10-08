import type { PoolClient } from "pg";
import type { GitHubAppConfig } from "../config/env";
import type { DevelopmentActivity } from "../domain/development-activity";
import { createInstallationAccessToken } from "../github/app";
import { collectRepositoryActivity } from "../github/activity";
import { buildGitHubReconciliationSnapshot } from "../github/sync";
import type { GitHubFetcher } from "../github/client";
import { getDatabasePool } from "./database";

type ActivityRow = { full_name: string; kind: DevelopmentActivity["kind"]; external_id: string; title: string; html_url: string; occurred_at: Date | string; actor_login: string | null; state: string | null; conclusion: string | null };

export async function loadProjectActivity(client: Pick<PoolClient, "query">, projectId: string): Promise<DevelopmentActivity[]> {
  const result = await client.query<ActivityRow>(`select activity.* from (
    select r.full_name, 'pull-request' as kind, gpr.github_pull_request_id::text as external_id, gpr.title, gpr.html_url,
      coalesce(gpr.merged_at, gpr.updated_at) as occurred_at, gpr.author_login as actor_login,
      case when gpr.merged_at is not null then 'merged' else gpr.state::text end as state, null::text as conclusion
    from github_pull_requests gpr join repositories r on r.id = gpr.repository_id
      join project_repositories pr on pr.repository_id = r.id where pr.project_id = $1
    union all
    select r.full_name, a.kind, a.external_id, a.title, a.html_url, a.occurred_at, a.actor_login, a.state, a.conclusion
    from github_development_activity a join repositories r on r.id = a.repository_id
      join project_repositories pr on pr.repository_id = r.id where pr.project_id = $1
    ) activity order by occurred_at desc, kind, external_id limit 100`, [projectId]);
  return result.rows.map((row) => ({ repositoryFullName: row.full_name, kind: row.kind, externalId: row.external_id, title: row.title,
    url: row.html_url, occurredAt: new Date(row.occurred_at).toISOString(), actor: row.actor_login ?? undefined, state: row.state ?? undefined, conclusion: row.conclusion ?? undefined }));
}

export async function persistDevelopmentActivity(client: Pick<PoolClient, "query">, activities: readonly DevelopmentActivity[]) {
  for (const activity of activities) await client.query(`insert into github_development_activity (repository_id, kind, external_id, title, html_url, occurred_at, actor_login, state, conclusion)
    select id, $2, $3, $4, $5, $6, $7, $8, $9 from repositories where full_name = $1
    on conflict (repository_id, kind, external_id) do update set title = excluded.title, html_url = excluded.html_url,
      occurred_at = excluded.occurred_at, actor_login = excluded.actor_login, state = excluded.state, conclusion = excluded.conclusion, last_synced_at = now()`,
  [activity.repositoryFullName, activity.kind, activity.externalId, activity.title, activity.url, activity.occurredAt, activity.actor ?? null, activity.state ?? null, activity.conclusion ?? null]);
}

export async function reconcileGitHubDevelopmentActivity(config: GitHubAppConfig, installationId: number, fetcher?: GitHubFetcher) {
  const snapshot = await buildGitHubReconciliationSnapshot(config, installationId, fetcher);
  const access = await createInstallationAccessToken(config, installationId, fetcher);
  const activities: DevelopmentActivity[] = [];
  for (const repository of snapshot.repositories) activities.push(...await collectRepositoryActivity(config, repository, access.token, snapshot.pullRequests, fetcher));
  const client = await getDatabasePool().connect();
  try { await client.query("begin"); await persistDevelopmentActivity(client, activities); await client.query("commit"); }
  catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
  return { activityRecords: activities.length, reconciledAt: new Date().toISOString() };
}
