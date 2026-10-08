import { describe, expect, it } from "vitest";
import {
  attachRepositoryProgress,
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
        percent: 40,
        repositories: []
      }
    ]);
  });

  it("attaches per-repository roadmap progress without changing project totals", () => {
    const projects = normalizePortfolioRows([
      {
        id: "project-1",
        display_name: "Multi Repo",
        status: "active-development",
        repository_full_name: "owner/core",
        repository_html_url: "https://github.com/owner/core",
        planned_pr_total: 10,
        completed_count: 4,
        in_progress_count: 1
      }
    ]);

    const result = attachRepositoryProgress(projects, [
      {
        project_id: "project-1",
        repository_id: "repo-core",
        full_name: "owner/core",
        html_url: "https://github.com/owner/core",
        planned_count: 6,
        completed_count: 3,
        in_progress_count: 1
      },
      {
        project_id: "project-1",
        repository_id: "repo-web",
        full_name: "owner/web",
        html_url: "https://github.com/owner/web",
        planned_count: 4,
        completed_count: 1,
        in_progress_count: 0
      }
    ]);

    expect(result[0].repositories).toEqual([
      {
        id: "repo-core",
        fullName: "owner/core",
        htmlUrl: "https://github.com/owner/core",
        completed: 3,
        inProgress: 1,
        planned: 6,
        percent: 50
      },
      {
        id: "repo-web",
        fullName: "owner/web",
        htmlUrl: "https://github.com/owner/web",
        completed: 1,
        inProgress: 0,
        planned: 4,
        percent: 25
      }
    ]);
    expect(result[0].planned).toBe(10);
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
          percent: 50,
          repositories: []
        },
        {
          id: "b",
          displayName: "B",
          status: "complete",
          completed: 5,
          inProgress: 0,
          planned: 5,
          percent: 100,
          repositories: []
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
