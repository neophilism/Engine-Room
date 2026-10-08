import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortfolioHome } from "../components/portfolio/portfolio-home";
import type { PortfolioOverviewData } from "../lib/server/portfolio-overview";

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
      percent: 40
    },
    {
      id: "complete",
      displayName: "Complete Project",
      status: "complete",
      completed: 5,
      inProgress: 0,
      planned: 5,
      percent: 100
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
    const names = container.querySelectorAll(".project-row strong");
    expect(names[0]).toHaveTextContent("Engine Room");
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
