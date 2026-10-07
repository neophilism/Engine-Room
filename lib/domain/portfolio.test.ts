import { describe, expect, it } from "vitest";
import {
  calculateRoadmapProgress,
  validateDevelopmentPlanGraph,
  type DevelopmentPlanGraph,
  type Milestone,
  type PlannedPullRequest
} from "./portfolio";

function buildGraph({
  plannedPrTotal = 4,
  merged = 1
}: {
  plannedPrTotal?: number;
  merged?: number;
} = {}): DevelopmentPlanGraph {
  const milestone: Milestone = {
    id: "milestone-1",
    developmentPlanId: "plan-1",
    ordinal: 1,
    name: "Foundation",
    plannedPrTotal,
    status: merged === plannedPrTotal ? "complete" : "active"
  };

  const plannedPullRequests: PlannedPullRequest[] = Array.from({ length: plannedPrTotal }, (_, index) => ({
    id: `planned-pr-${index + 1}`,
    developmentPlanId: "plan-1",
    milestoneId: milestone.id,
    ordinal: index + 1,
    title: `PR ${index + 1}`,
    status: index < merged ? "merged" : "planned",
    ...(index < merged ? { mergedAt: "2026-10-07T00:00:00Z" } : {})
  }));

  return {
    plan: {
      id: "plan-1",
      projectId: "project-1",
      version: 1,
      status: "approved",
      title: "Approved development plan",
      plannedPrTotal
    },
    milestones: [milestone],
    plannedPullRequests
  };
}

describe("portfolio domain model", () => {
  it("calculates roadmap progress from merged planned PRs only", () => {
    expect(calculateRoadmapProgress(buildGraph({ plannedPrTotal: 40, merged: 3 }))).toEqual({
      completed: 3,
      planned: 40,
      remaining: 37,
      percent: 7.5
    });
  });

  it("does not treat skipped planned PRs as completed work", () => {
    const graph = buildGraph({ plannedPrTotal: 2, merged: 1 });
    graph.plannedPullRequests = graph.plannedPullRequests.map((plannedPr, index) =>
      index === 1 ? { ...plannedPr, status: "skipped" } : plannedPr
    );

    expect(calculateRoadmapProgress(graph).completed).toBe(1);
  });

  it("detects when the imported PR list does not match the approved denominator", () => {
    const graph = buildGraph({ plannedPrTotal: 4, merged: 1 });
    graph.plan = { ...graph.plan, plannedPrTotal: 5 };

    expect(validateDevelopmentPlanGraph(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "plan-count-mismatch" })
      ])
    );
  });

  it("detects a milestone count mismatch", () => {
    const graph = buildGraph({ plannedPrTotal: 4, merged: 1 });
    graph.milestones = [{ ...graph.milestones[0], plannedPrTotal: 3 }];

    expect(validateDevelopmentPlanGraph(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "milestone-count-mismatch" })
      ])
    );
  });

  it("rejects merged planned PRs without a merge timestamp", () => {
    const graph = buildGraph({ plannedPrTotal: 1, merged: 1 });
    graph.plannedPullRequests = [{ ...graph.plannedPullRequests[0], mergedAt: undefined }];

    expect(validateDevelopmentPlanGraph(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "merged-without-timestamp" })
      ])
    );
  });
});
