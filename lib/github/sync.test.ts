import { describe, expect, it, vi } from "vitest";
import type { GitHubAppConfig } from "../config/env";
import { listRepositoryPullRequests } from "./sync";
import type { DiscoveredRepository } from "./types";

const config: GitHubAppConfig = {
  appId: "123",
  privateKey: "unused-in-this-test",
  apiBaseUrl: "https://api.github.test"
};

const repository: DiscoveredRepository = {
  githubRepositoryId: 1,
  ownerLogin: "owner name",
  name: "repo name",
  fullName: "owner name/repo name",
  htmlUrl: "https://github.test/owner/repo",
  defaultBranch: "main",
  visibility: "private",
  archived: false
};

describe("GitHub synchronization", () => {
  it("normalizes pull requests and safely encodes repository paths", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 99,
            number: 12,
            title: "Ship reconciliation",
            state: "closed",
            draft: false,
            html_url: "https://github.test/owner/repo/pull/12",
            created_at: "2026-10-01T00:00:00Z",
            updated_at: "2026-10-07T00:00:00Z",
            closed_at: "2026-10-07T00:00:00Z",
            merged_at: "2026-10-07T00:00:00Z",
            user: { login: "octocat" }
          }
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(
      listRepositoryPullRequests(config, repository, "token", fetcher)
    ).resolves.toEqual([
      {
        githubPullRequestId: 99,
        repositoryFullName: "owner name/repo name",
        number: 12,
        title: "Ship reconciliation",
        state: "closed",
        draft: false,
        htmlUrl: "https://github.test/owner/repo/pull/12",
        authorLogin: "octocat",
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-07T00:00:00Z",
        closedAt: "2026-10-07T00:00:00Z",
        mergedAt: "2026-10-07T00:00:00Z"
      }
    ]);

    expect(String(fetcher.mock.calls[0][0])).toContain(
      "/repos/owner%20name/repo%20name/pulls?"
    );
  });
});
