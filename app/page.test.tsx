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
    expect(screen.getByText("Planned PRs completed").nextSibling).toHaveTextContent("46.7%");
    expect(screen.getByText("GitHub PRs open / closed").nextSibling).toHaveTextContent("N/A");
  });

  it("removes animation testing and makes secondary monitoring optional", () => {
    const { container } = render(<PortfolioHome overview={overview} />);
    expect(screen.queryByText("Machine animation preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Roadmap signal path")).not.toBeInTheDocument();
    expect(screen.getByText("Project progress")).toBeInTheDocument();
    const operations = container.querySelector(".dashboard-operations-details") as HTMLDetailsElement;
    expect(operations).toBeInTheDocument();
    expect(operations.open).toBe(false);
    expect(screen.getByText("Activity and connected services")).toBeInTheDocument();
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
    expect(screen.getAllByText("Plan allocation N/A")[0]).toBeInTheDocument();
    expect(screen.queryByText("0/0 PRs")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
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
