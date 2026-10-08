import { describe, expect, it } from "vitest";
import {
  calculateMilestoneProgress,
  calculateProjectLifecycleState
} from "./milestone-lifecycle";
import type {
  DevelopmentPlanGraph,
  Milestone,
  PlannedPullRequest
} from "./portfolio";

const milestone: Milestone = {
  id: "phase-1",
  developmentPlanId: "plan-1",
  ordinal: 1,
  name: "Foundation",
  plannedPrTotal: 2,
  status: "planned"
};

function planned(
  ordinal: number,
  status: PlannedPullRequest["status"]
): PlannedPullRequest {
  return {
    id: `pr-${ordinal}`,
    developmentPlanId: "plan-1",
    milestoneId: "phase-1",
    ordinal,
    title: `PR ${ordinal}`,
    status,
    ...(status === "merged"
      ? { mergedAt: "2026-10-07T00:00:00Z" }
      : {})
  };
}

function graph(statuses: PlannedPullRequest["status"][]): DevelopmentPlanGraph {
  return {
    plan: {
      id: "plan-1",
      projectId: "project-1",
      version: 1,
      status: "approved",
      title: "Plan",
      plannedPrTotal: statuses.length
    },
    milestones: [{ ...milestone, plannedPrTotal: statuses.length }],
    plannedPullRequests: statuses.map((status, index) =>
      planned(index + 1, status)
    )
  };
}

describe("milestone and lifecycle calculations", () => {
  it("keeps untouched milestones planned", () => {
    expect(
      calculateMilestoneProgress(milestone, [
        planned(1, "planned"),
        planned(2, "planned")
      ])
    ).toEqual({
      milestoneId: "phase-1",
      status: "planned",
      completed: 0,
      planned: 2,
      percent: 0
    });
  });

  it("makes a milestone active once work has started", () => {
    expect(
      calculateMilestoneProgress(milestone, [
        planned(1, "merged"),
        planned(2, "in-progress")
      ])
    ).toMatchObject({
      status: "active",
      completed: 1,
      percent: 50
    });
  });

  it("marks a milestone complete only when every planned PR is merged", () => {
    expect(
      calculateMilestoneProgress(milestone, [
        planned(1, "merged"),
        planned(2, "merged")
      ])
    ).toMatchObject({
      status: "complete",
      completed: 2,
      percent: 100
    });
  });

  it("preserves an explicit blocked milestone until its work is complete", () => {
    const blocked = { ...milestone, status: "blocked" as const };

    expect(
      calculateMilestoneProgress(blocked, [
        planned(1, "merged"),
        planned(2, "planned")
      ]).status
    ).toBe("blocked");

    expect(
      calculateMilestoneProgress(blocked, [
        planned(1, "merged"),
        planned(2, "merged")
      ]).status
    ).toBe("complete");
  });

  it("derives planned, active-development, and complete project states", () => {
    expect(calculateProjectLifecycleState(graph(["planned"]), "planned").projectStatus).toBe(
      "planned"
    );
    expect(
      calculateProjectLifecycleState(graph(["in-progress"]), "planned").projectStatus
    ).toBe("active-development");
    expect(
      calculateProjectLifecycleState(graph(["merged"]), "active-development").projectStatus
    ).toBe("complete");
  });

  it("does not overwrite operational or administrative lifecycle states", () => {
    for (const status of ["beta", "live", "maintenance", "paused", "archived"] as const) {
      expect(calculateProjectLifecycleState(graph(["planned"]), status).projectStatus).toBe(
        status
      );
    }
  });

  it("fails if milestone membership disagrees with the approved plan", () => {
    expect(() =>
      calculateMilestoneProgress(
        { ...milestone, plannedPrTotal: 3 },
        [planned(1, "planned"), planned(2, "planned")]
      )
    ).toThrow("expects 3 planned PRs but received 2");
  });
});
