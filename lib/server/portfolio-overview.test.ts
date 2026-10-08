import { describe, expect, it } from "vitest";
import {
  calculatePortfolioStatistics,
  normalizePortfolioRows
} from "./portfolio-overview";

describe("portfolio overview data", () => {
  it("normalizes database count fields and calculates project percentages", () => {
    expect(
      normalizePortfolioRows([
        {
          id: "project-1",
          display_name: "Engine Room",
          status: "active-development",
          repository_full_name: "neophilism/Engine-Room",
          repository_html_url: "https://github.com/neophilism/Engine-Room",
          planned_pr_total: 40,
          completed_count: "16",
          in_progress_count: "1"
        }
      ])
    ).toEqual([
      {
        id: "project-1",
        displayName: "Engine Room",
        status: "active-development",
        repositoryFullName: "neophilism/Engine-Room",
        repositoryUrl: "https://github.com/neophilism/Engine-Room",
        completed: 16,
        inProgress: 1,
        planned: 40,
        percent: 40
      }
    ]);
  });

  it("calculates aggregate live portfolio statistics from approved roadmaps", () => {
    expect(
      calculatePortfolioStatistics([
        {
          id: "a",
          displayName: "A",
          status: "active-development",
          completed: 10,
          inProgress: 1,
          planned: 20,
          percent: 50
        },
        {
          id: "b",
          displayName: "B",
          status: "complete",
          completed: 5,
          inProgress: 0,
          planned: 5,
          percent: 100
        }
      ])
    ).toEqual({
      projects: 2,
      activeProjects: 1,
      completedRoadmapPrs: 15,
      plannedRoadmapPrs: 25,
      percent: 60
    });
  });

  it("handles an empty portfolio without NaN or invented progress", () => {
    expect(calculatePortfolioStatistics([])).toEqual({
      projects: 0,
      activeProjects: 0,
      completedRoadmapPrs: 0,
      plannedRoadmapPrs: 0,
      percent: 0
    });
  });
});
