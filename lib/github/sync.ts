import type { GitHubAppConfig } from "../config/env";
import { createInstallationAccessToken } from "./app";
import { requestGitHubJson, type GitHubFetcher } from "./client";
import { discoverInstallationRepositories } from "./discovery";
import type {
  DiscoveredRepository,
  GitHubPullRequestPayload,
  SynchronizedPullRequest
} from "./types";

function normalizePullRequest(
  repository: DiscoveredRepository,
  pullRequest: GitHubPullRequestPayload
): SynchronizedPullRequest {
  return {
    githubPullRequestId: pullRequest.id,
    repositoryFullName: repository.fullName,
    number: pullRequest.number,
    title: pullRequest.title,
    state: pullRequest.state,
    draft: pullRequest.draft,
    htmlUrl: pullRequest.html_url,
    authorLogin: pullRequest.user?.login,
    createdAt: pullRequest.created_at,
    updatedAt: pullRequest.updated_at,
    closedAt: pullRequest.closed_at ?? undefined,
    mergedAt: pullRequest.merged_at ?? undefined
  };
}

export async function listRepositoryPullRequests(
  config: GitHubAppConfig,
  repository: DiscoveredRepository,
  installationToken: string,
  fetcher?: GitHubFetcher
): Promise<SynchronizedPullRequest[]> {
  const pullRequests: SynchronizedPullRequest[] = [];
  const perPage = 100;

  for (let page = 1; ; page += 1) {
    const result = await requestGitHubJson<GitHubPullRequestPayload[]>(
      `${config.apiBaseUrl}/repos/${encodeURIComponent(repository.ownerLogin)}/${encodeURIComponent(repository.name)}/pulls?state=all&sort=updated&direction=desc&per_page=${perPage}&page=${page}`,
      { token: installationToken, fetcher }
    );

    pullRequests.push(...result.map((pullRequest) => normalizePullRequest(repository, pullRequest)));
    if (result.length < perPage) break;
  }

  return pullRequests;
}

export async function buildGitHubReconciliationSnapshot(
  config: GitHubAppConfig,
  installationId: number,
  fetcher?: GitHubFetcher
) {
  const repositories = await discoverInstallationRepositories(config, installationId, fetcher);
  const access = await createInstallationAccessToken(config, installationId, fetcher);
  const pullRequests: SynchronizedPullRequest[] = [];

  for (const repository of repositories) {
    pullRequests.push(
      ...(await listRepositoryPullRequests(config, repository, access.token, fetcher))
    );
  }

  return {
    repositories,
    pullRequests,
    reconciledAt: new Date().toISOString()
  };
}
