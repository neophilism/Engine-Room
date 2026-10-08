import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { GitHubAppConfig } from "../config/env";
import { discoverInstallationRepositories } from "./discovery";

function config(): GitHubAppConfig {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    appId: "123",
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    apiBaseUrl: "https://api.github.test"
  };
}

describe("GitHub repository discovery", () => {
  it("exchanges an app JWT for an installation token and normalizes repositories", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "installation-token", expires_at: "2026-10-08T03:00:00Z" }), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total_count: 2,
            repositories: [
              {
                id: 1,
                name: "Engine-Room",
                full_name: "neophilism/Engine-Room",
                html_url: "https://github.com/neophilism/Engine-Room",
                default_branch: "main",
                archived: false,
                visibility: "public",
                private: false,
                owner: { login: "neophilism" }
              },
              {
                id: 2,
                name: "Private-Control",
                full_name: "neophilism/Private-Control",
                html_url: "https://github.com/neophilism/Private-Control",
                default_branch: "trunk",
                archived: true,
                private: true,
                owner: { login: "neophilism" }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const repositories = await discoverInstallationRepositories(config(), 42, fetcher);

    expect(repositories).toEqual([
      {
        githubRepositoryId: 1,
        ownerLogin: "neophilism",
        name: "Engine-Room",
        fullName: "neophilism/Engine-Room",
        htmlUrl: "https://github.com/neophilism/Engine-Room",
        defaultBranch: "main",
        visibility: "public",
        archived: false
      },
      {
        githubRepositoryId: 2,
        ownerLogin: "neophilism",
        name: "Private-Control",
        fullName: "neophilism/Private-Control",
        htmlUrl: "https://github.com/neophilism/Private-Control",
        defaultBranch: "trunk",
        visibility: "private",
        archived: true
      }
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[1][0])).toContain("/installation/repositories?per_page=100&page=1");
  });

  it("rejects invalid installation ids before making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(discoverInstallationRepositories(config(), 0, fetcher)).rejects.toThrow(
      "installationId must be a positive integer"
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});
