import { describe, expect, it } from "vitest";
import { normalizeProjectDashboard } from "./project-dashboard";

const project = { id: "project", slug: "project", display_name: "Project", summary: null, status: "active-development" as const };
const plan = { id: "plan", project_id: "project", version: 1, title: "Approved", summary: null, planned_pr_total: 2, approved_at: new Date("2026-10-08T00:00:00Z") };
const milestone = { id: "milestone", development_plan_id: "plan", ordinal: 1, name: "Foundation", description: null, planned_pr_total: 2, status: "planned" as const };
const prs = [1, 2].map((ordinal) => ({ id: `p${ordinal}`, development_plan_id: "plan", milestone_id: "milestone", repository_id: "repo", ordinal,
  title: `PR ${ordinal}`, description: null, status: ordinal === 1 ? "merged" as const : "planned" as const, github_pr_number: ordinal, merged_at: ordinal === 1 ? new Date("2026-10-08T00:00:00Z") : null }));

describe("project dashboard", () => {
  it("derives milestone progress and normalizes timestamp values", () => {
    const data = normalizeProjectDashboard(project, [], plan, [milestone], prs);
    expect(data.progress).toEqual({ completed: 1, planned: 2, remaining: 1, percent: 50 });
    expect(data.milestones[0]).toMatchObject({ status: "active", completed: 1, planned: 2 });
    expect(data.graph?.plannedPullRequests[0].mergedAt).toBe("2026-10-08T00:00:00.000Z");
  });
  it("does not manufacture a plan or progress for a registered project without a plan", () => {
    const data = normalizeProjectDashboard(project, [], undefined, [], []);
    expect(data.project?.displayName).toBe("Project");
    expect(data.progress).toBeUndefined();
  });
  it("rejects incomplete plan imports instead of presenting a wrong denominator", () => {
    expect(() => normalizeProjectDashboard(project, [], plan, [milestone], prs.slice(0, 1))).toThrow("Invalid development plan graph");
  });
});
