import { describe, expect, it } from "vitest";
import { applySynchronizedPullRequests } from "./planned-pr-completion";
import type { DevelopmentPlanGraph } from "./portfolio";
import type { SynchronizedPullRequest } from "../github/types";

function graph(): DevelopmentPlanGraph {
  return {
    plan: {
      id: "plan",
      projectId: "project",
      version: 1,
      status: "approved",
      title: "Plan",
      plannedPrTotal: 3
    },
    milestones: [
      {
        id: "milestone",
        developmentPlanId: "plan",
        ordinal: 1,
        name: "Phase",
        plannedPrTotal: 3,
        status: "active"
      }
    ],
    plannedPullRequests: [1, 2, 3].map((ordinal) => ({
      id: `planned-${ordinal}`,
      developmentPlanId: "plan",
      milestoneId: "milestone",
      ordinal,
      title: `PR ${ordinal}`,
      status: "planned",
      githubPrNumber: ordinal
    }))
  };
}

function live(overrides: Partial<SynchronizedPullRequest>): SynchronizedPullRequest {
  return {
    githubPullRequestId: 1,
    repositoryFullName: "owner/repo",
    number: 1,
    title: "PR",
    state: "open",
    draft: false,
    htmlUrl: "https://github.test/pull/1",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-07T00:00:00Z",
    ...overrides
  };
}

describe("planned PR completion engine", () => {
  it("counts only merged mapped planned PRs as completed", () => {
    const result = applySynchronizedPullRequests(graph(), [
      live({ number: 1, state: "closed", mergedAt: "2026-10-07T00:00:00Z" }),
      live({ number: 2, state: "open" }),
      live({ number: 3, state: "closed" })
    ]);

    expect(result.plannedPullRequests.map((pr) => pr.status)).toEqual([
      "merged",
      "in-progress",
      "planned"
    ]);
    expect(result.progress).toEqual({
      completed: 1,
      planned: 3,
      remaining: 2,
      percent: 33.3
    });
  });

  it("removes stale merged state when GitHub no longer reports a merge", () => {
    const current = graph();
    const withStaleMerge: DevelopmentPlanGraph = {
      ...current,
      plannedPullRequests: current.plannedPullRequests.map((plannedPr, index) =>
        index === 0
          ? {
              ...plannedPr,
              status: "merged" as const,
              mergedAt: "2026-10-01T00:00:00Z"
            }
          : plannedPr
      )
    };

    const result = applySynchronizedPullRequests(withStaleMerge, [
      live({ number: 1, state: "open" })
    ]);
    expect(result.plannedPullRequests[0]).toMatchObject({
      status: "in-progress",
      mergedAt: undefined
    });
  });

  it("fails on ambiguous PR numbers instead of guessing repository identity", () => {
    expect(() =>
      applySynchronizedPullRequests(graph(), [
        live({ githubPullRequestId: 1, number: 1, repositoryFullName: "a/repo" }),
        live({ githubPullRequestId: 2, number: 1, repositoryFullName: "b/repo" })
      ])
    ).toThrow("Ambiguous synchronized PR #1");
  });
});
