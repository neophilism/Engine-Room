import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortfolioHome } from "../components/portfolio/portfolio-home";
import type { PortfolioOverviewData } from "../lib/domain/portfolio-overview";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const overview: PortfolioOverviewData = {
  source: "database",
  statistics: {
    projects: 2,
    activeProjects: 1,
    completedRoadmapPrs: 21,
    plannedRoadmapPrs: 45,
    percent: 46.7
  },
  projects: [
    {
      id: "engine-room",
      displayName: "Engine Room",
      status: "active-development",
      repositoryFullName: "neophilism/Engine-Room",
      completed: 16,
      inProgress: 1,
      planned: 40,
      percent: 40,
      repositories: [
        {
          id: "engine-room-repo",
          fullName: "neophilism/Engine-Room",
          htmlUrl: "https://github.com/neophilism/Engine-Room",
          completed: 16,
          inProgress: 1,
          planned: 40,
          percent: 40
        }
      ]
    },
    {
      id: "complete",
      displayName: "Complete Project",
      status: "complete",
      completed: 5,
      inProgress: 0,
      planned: 5,
      percent: 100,
      repositories: []
    }
  ]
};

describe("portfolio home", () => {
  it("renders live portfolio statistics", () => {
    render(<PortfolioHome overview={overview} />);

    expect(screen.getByText("Projects tracked").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("21/45")).toBeInTheDocument();
    expect(screen.getByText("46.7%")).toBeInTheDocument();
  });

  it("renders Engine Room first when the data layer returns it first", () => {
    const { container } = render(<PortfolioHome overview={overview} />);
    const names = container.querySelectorAll(".project-progress-heading strong");
    expect(names[0]).toHaveTextContent("Engine Room");
  });

  it("never reports zero percent for a repository with no approved plan", () => {
    const unscored: PortfolioOverviewData = {
      source: "database",
      projects: [{
        id: "discovered", displayName: "Discovered Repository", status: "planned",
        repositoryFullName: "neophilism/Discovered",
        repositoryUrl: "https://github.com/neophilism/Discovered",
        planned: 0, completed: 0, inProgress: 0, percent: 0, repositories: []
      }],
      statistics: {
        projects: 1, activeProjects: 0,
        completedRoadmapPrs: 0, plannedRoadmapPrs: 0, percent: 0
      }
    };
    render(<PortfolioHome overview={unscored} />);
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Plan mapping N/A")[0]).toBeInTheDocument();
    expect(screen.queryByText("0/0 PRs")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("surfaces real repository activity separately from unverified roadmap completion", () => {
    const data: PortfolioOverviewData = {
      ...overview,
      statistics: { projects: 1, activeProjects: 1, completedRoadmapPrs: 0, plannedRoadmapPrs: 0, percent: 0 },
      projects: [{
        id: "repo", displayName: "Real GitHub Repository", status: "planned",
        repositoryFullName: "neophilism/Real", completed: 0, inProgress: 0, planned: 0, percent: 0,
        repositories: [],
        activity: { total: 15, merged: 11, open: 4, drafts: 1, failedChecks: 2, runningChecks: 1, lastObservedAt: "2026-10-09T20:00:00Z" }
      }]
    };
    render(<PortfolioHome overview={data} />);
    expect(screen.getByText("Observed GitHub PR records").nextSibling).toHaveTextContent("15");
    expect(screen.getByText("Observed merged PRs").nextSibling).toHaveTextContent("11");
    expect(screen.getByText("Observed open PRs").nextSibling).toHaveTextContent("4");
    expect(screen.getByText(/11 merged \/ 15 observed GitHub PRs/)).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });

  it("shows a truthful empty state instead of static demo projects", () => {
    render(
      <PortfolioHome
        overview={{
          source: "unconfigured",
          projects: [],
          statistics: {
            projects: 0,
            activeProjects: 0,
            completedRoadmapPrs: 0,
            plannedRoadmapPrs: 0,
            percent: 0
          }
        }}
      />
    );

    expect(screen.getByText("Database not configured")).toBeInTheDocument();
    expect(screen.queryByText("RAM Marketplace")).not.toBeInTheDocument();
  });
});
