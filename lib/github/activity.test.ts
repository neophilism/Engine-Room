import { describe, expect, it, vi } from "vitest";
import { collectRepositoryActivity } from "./activity";

describe("GitHub development activity adapter", () => {
  it("normalizes commits, issues, reviews, and workflows while excluding PR-shaped issues and pending reviews", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const path = String(input);
      const payload = path.includes("/commits?") ? [{ sha: "abc", html_url: "https://github.com/o/r/commit/abc", author: null, commit: { message: "Commit title\nMore details", author: null, committer: { date: "2026-10-08T01:00:00Z" } } }]
        : path.includes("/issues?") ? [{ id: 1, title: "An issue", html_url: "https://github.com/o/r/issues/1", state: "open", updated_at: "2026-10-08T02:00:00Z", user: null }, { id: 2, pull_request: {}, title: "PR-shaped issue" }]
          : path.includes("/actions/runs?") ? { workflow_runs: [{ id: 3, name: "CI", html_url: "https://github.com/o/r/actions/runs/3", status: "completed", conclusion: "failure", updated_at: "2026-10-08T03:00:00Z", actor: { login: "author" } }] }
            : [{ id: 4, html_url: "https://github.com/o/r/pull/1#review", state: "APPROVED", submitted_at: "2026-10-08T04:00:00Z", user: null }, { id: 5, state: "PENDING", submitted_at: null }];
      return new Response(JSON.stringify(payload), { status: 200 });
    });
    const result = await collectRepositoryActivity({ appId: "1", privateKey: "unused", apiBaseUrl: "https://api.github.com" },
      { githubRepositoryId: 1, ownerLogin: "o", name: "r", fullName: "o/r", htmlUrl: "https://github.com/o/r", defaultBranch: "main", visibility: "public", archived: false }, "token",
      [{ githubPullRequestId: 1, repositoryFullName: "o/r", number: 1, title: "PR title", state: "open", draft: false, htmlUrl: "https://github.com/o/r/pull/1", createdAt: "2026-10-08T00:00:00Z", updatedAt: "2026-10-08T00:00:00Z" }], fetcher);
    expect(result.map((activity) => activity.kind)).toEqual(["review", "workflow", "issue", "commit"]);
    expect(result.find((activity) => activity.kind === "workflow")?.conclusion).toBe("failure");
    expect(result.find((activity) => activity.kind === "commit")?.title).toBe("Commit title");
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});
