import type { GitHubAppConfig } from "../config/env";
import { buildGitHubReconciliationSnapshot } from "../github/sync";
import type { GitHubFetcher } from "../github/client";
import { getDatabasePool } from "./database";

export async function reconcileGitHubInstallation(
  config: GitHubAppConfig,
  installationId: number,
  fetcher?: GitHubFetcher
) {
  const snapshot = await buildGitHubReconciliationSnapshot(config, installationId, fetcher);
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    for (const repository of snapshot.repositories) {
      await client.query(
        `insert into repositories (
          id, github_repository_id, owner_login, name, full_name, html_url,
          default_branch, visibility, archived, updated_at
        ) values (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7::repository_visibility, $8, now()
        )
        on conflict (github_repository_id) do update set
          owner_login = excluded.owner_login,
          name = excluded.name,
          full_name = excluded.full_name,
          html_url = excluded.html_url,
          default_branch = excluded.default_branch,
          visibility = excluded.visibility,
          archived = excluded.archived,
          updated_at = now()`,
        [
          repository.githubRepositoryId,
          repository.ownerLogin,
          repository.name,
          repository.fullName,
          repository.htmlUrl,
          repository.defaultBranch,
          repository.visibility,
          repository.archived
        ]
      );
    }

    for (const pullRequest of snapshot.pullRequests) {
      await client.query(
        `insert into github_pull_requests (
          github_pull_request_id, repository_id, number, title, state, draft,
          html_url, author_login, created_at, updated_at, closed_at, merged_at,
          last_synced_at
        )
        select
          $1, r.id, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now()
        from repositories r
        where r.full_name = $2
        on conflict (github_pull_request_id) do update set
          repository_id = excluded.repository_id,
          number = excluded.number,
          title = excluded.title,
          state = excluded.state,
          draft = excluded.draft,
          html_url = excluded.html_url,
          author_login = excluded.author_login,
          updated_at = excluded.updated_at,
          closed_at = excluded.closed_at,
          merged_at = excluded.merged_at,
          last_synced_at = now()`,
        [
          pullRequest.githubPullRequestId,
          pullRequest.repositoryFullName,
          pullRequest.number,
          pullRequest.title,
          pullRequest.state,
          pullRequest.draft,
          pullRequest.htmlUrl,
          pullRequest.authorLogin ?? null,
          pullRequest.createdAt,
          pullRequest.updatedAt,
          pullRequest.closedAt ?? null,
          pullRequest.mergedAt ?? null
        ]
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return {
    repositories: snapshot.repositories.length,
    pullRequests: snapshot.pullRequests.length,
    reconciledAt: snapshot.reconciledAt
  };
}
