import type { GitHubAppConfig } from "../config/env";
import { createInstallationAccessToken } from "./app";
import { requestGitHubJson, type GitHubFetcher } from "./client";
import type {
  DiscoveredRepository,
  GitHubInstallationRepositoriesResponse,
  GitHubRepositoryPayload
} from "./types";

function normalizeRepository(repository: GitHubRepositoryPayload): DiscoveredRepository {
  return {
    githubRepositoryId: repository.id,
    ownerLogin: repository.owner.login,
    name: repository.name,
    fullName: repository.full_name,
    htmlUrl: repository.html_url,
    defaultBranch: repository.default_branch,
    visibility: repository.visibility ?? (repository.private ? "private" : "public"),
    archived: repository.archived
  };
}

export async function discoverInstallationRepositories(
  config: GitHubAppConfig,
  installationId: number,
  fetcher?: GitHubFetcher
): Promise<DiscoveredRepository[]> {
  const access = await createInstallationAccessToken(config, installationId, fetcher);
  const repositories: DiscoveredRepository[] = [];
  const perPage = 100;

  for (let page = 1; ; page += 1) {
    const result = await requestGitHubJson<GitHubInstallationRepositoriesResponse>(
      `${config.apiBaseUrl}/installation/repositories?per_page=${perPage}&page=${page}`,
      {
        token: access.token,
        fetcher
      }
    );

    repositories.push(...result.repositories.map(normalizeRepository));

    if (result.repositories.length < perPage || repositories.length >= result.total_count) {
      break;
    }
  }

  return repositories;
}
