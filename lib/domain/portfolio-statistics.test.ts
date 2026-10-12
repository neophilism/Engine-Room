import { describe, expect, it } from "vitest";
import { calculatePortfolioStatistics, calculatePortfolioWorkload } from "./portfolio-statistics";
import type { PortfolioProjectOverview } from "./portfolio-overview";

const project = (id: string, completed: number, planned: number, inProgress = 0): PortfolioProjectOverview => ({
  id, displayName: id, status: "active-development", completed, planned, inProgress,
  percent: planned ? completed / planned * 100 : 0, repositories: []
});

describe("portfolio workload", () => {
  it("weights by approved work instead of averaging project percentages", () => {
    expect(calculatePortfolioWorkload([project("small", 1, 1), project("large", 0, 99, 3)]))
      .toMatchObject({ completedRoadmapPrs: 1, plannedRoadmapPrs: 100, percent: 1, underway: 3, remaining: 99 });
  });
  it("uses each project total once even when work is split across repositories", () => {
    const p = project("multi", 3, 10, 2);
    p.repositories = [{ id: "r", fullName: "owner/repo", htmlUrl: "https://github.com/owner/repo", completed: 3, planned: 10, inProgress: 2, percent: 30 }];
    expect(calculatePortfolioWorkload([p])).toMatchObject({ plannedRoadmapPrs: 10, completedRoadmapPrs: 3, remaining: 7 });
  });
  it("handles an empty portfolio and plans that have all merged", () => {
    expect(calculatePortfolioWorkload([])).toMatchObject({ percent: 0, remaining: 0, underway: 0 });
    expect(calculatePortfolioWorkload([project("complete", 10, 10)])).toMatchObject({ percent: 100, remaining: 0 });
  });
  it("keeps the entire planned denominator when only 10 of 100 units are mapped", () => {
    const incomplete = project("100-item-plan", 9, 100, 1);
    incomplete.completionMeasured = false;
    incomplete.sourcePlan = {
      original: 100, originalComplete: 9, added: 0, addedComplete: 0, unmapped: 90,
      items: [], documents: []
    };
    expect(calculatePortfolioWorkload([incomplete]))
      .toMatchObject({ completedRoadmapPrs: 9, plannedRoadmapPrs: 100, percent: 9, remaining: 91 });
  });

  it("weights newly planned additions without erasing the green original plan", () => {
    const ongoing = project("engine-room", 40, 40, 1);
    ongoing.sourcePlan = {
      original: 40, originalComplete: 40, added: 60, addedComplete: 9, unmapped: 51,
      items: [], documents: []
    };
    expect(calculatePortfolioWorkload([ongoing]))
      .toMatchObject({ completedRoadmapPrs: 49, plannedRoadmapPrs: 100, percent: 49, remaining: 51 });
  });

});

describe("automatic active project classification", () => {
  it("counts 42 developing projects even when 16 retain the original registration state", () => {
    const projects=Array.from({length:42},(_,i)=>({
      ...project("project-"+i,0,1),status:i<16?"planned" as const:"active-development" as const,
      activity:{total:1,merged:1,open:0,drafts:0,failedChecks:0,runningChecks:0,lastObservedAt:null}
    }));
    expect(calculatePortfolioStatistics(projects)).toMatchObject({projects:42,activeProjects:42});
  });
  it("does not count genuinely unstarted or deliberately paused projects", () => {
    const projects=["planned","paused","archived","complete","live"].map((status,i)=>({
      ...project("project-"+i,0,1),
      status:status as PortfolioProjectOverview["status"],
      activity:{total:i===0?0:4,merged:0,open:0,drafts:0,failedChecks:0,runningChecks:0,lastObservedAt:null}
    }));
    expect(calculatePortfolioStatistics(projects)).toMatchObject({projects:5,activeProjects:1});
  });
});
