import { describe, expect, it } from "vitest";
import { groupLifecycleLanes } from "./lifecycle-lanes";
import type { PortfolioProjectOverview } from "./portfolio-overview";

const project = (id: string, status: PortfolioProjectOverview["status"]): PortfolioProjectOverview => ({
  id, displayName: id, status, planned: 40, completed: 40, inProgress: 0, percent: 100, repositories: []
});

describe("lifecycle lanes", () => {
  it("preserves explicit live, beta, paused, and archived state regardless of roadmap percentage", () => {
    const lanes = groupLifecycleLanes([project("Beta", "beta"), project("Live", "live"), project("Paused", "paused"), project("Archived", "archived")]);
    for (const status of ["beta", "live", "paused", "archived"]) expect(lanes.find((lane) => lane.status === status)?.projects).toHaveLength(1);
    expect(lanes.find((lane) => lane.status === "complete")?.projects).toHaveLength(0);
    expect(lanes.flatMap((lane) => lane.projects)).toHaveLength(4);
  });
  it("includes empty stages and never drops planning projects without roadmap work", () => {
    const p = { ...project("Planning", "planned"), planned: 0, completed: 0, percent: 0 };
    const lanes = groupLifecycleLanes([p]);
    expect(lanes).toHaveLength(8);
    expect(lanes[0].projects).toEqual([p]);
    expect(groupLifecycleLanes([]).every((lane) => lane.projects.length === 0)).toBe(true);
  });
});
