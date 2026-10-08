import { describe, expect, it } from "vitest";
import { classifyProjectPullRequests, type PortfolioPrActivityRow } from "./repository-pr-activity";

const row: PortfolioPrActivityRow = {
  project_id: "engine-room",
  total_count: "55",
  merged_count: "54",
  open_count: "1",
  closed_unmerged_count: "0",
  additional_total_count: "15",
  additional_merged_count: "14",
  additional_open_count: "1",
  additional_closed_unmerged_count: "0",
  mapped_units: "40",
  latest_observation: new Date("2026-10-08T12:00:00Z")
};

describe("approved vs post-roadmap pull request classification", () => {
  it("keeps original 40 mapped units independent of 15 additional PRs", () => {
    const result = classifyProjectPullRequests(row, 40);
    expect(result.mappingComplete).toBe(true);
    expect(result.observed).toMatchObject({ total: 55, merged: 54, open: 1, lastObservedAt: "2026-10-08T12:00:00.000Z" });
    expect(result.additional).toEqual({ total: 15, merged: 14, open: 1, closedUnmerged: 0 });
  });
  it("refuses to call PRs additional before every approved plan unit is mapped", () => {
    expect(classifyProjectPullRequests({ ...row, mapped_units: "39" }, 40)).toMatchObject({ mappingComplete: false });
    expect(classifyProjectPullRequests({ ...row, mapped_units: "39" }, 40).additional).toBeUndefined();
  });
  it("never treats PRs from an unplanned repo as post-roadmap", () => {
    const result = classifyProjectPullRequests({ ...row, mapped_units: "0" }, 0);
    expect(result.observed.total).toBe(55);
    expect(result.additional).toBeUndefined();
  });
  it("distinguishes closed-unmerged work from merged and open PRs", () => {
    expect(classifyProjectPullRequests({
      ...row, total_count: 56, closed_unmerged_count: 1, additional_total_count: 16, additional_closed_unmerged_count: 1
    }, 40).additional).toMatchObject({ total: 16, merged: 14, open: 1, closedUnmerged: 1 });
  });
  it("rejects inconsistent or missing source evidence", () => {
    expect(() => classifyProjectPullRequests({ ...row, additional_total_count: 16 }, 40)).toThrow();
    expect(() => classifyProjectPullRequests({ ...row, latest_observation: null }, 40)).toThrow();
    expect(() => classifyProjectPullRequests({ ...row, total_count: -1 }, 40)).toThrow();
  });
});
