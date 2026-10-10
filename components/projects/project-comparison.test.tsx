import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectComparison } from "./project-comparison";
import type { PortfolioOverviewData } from "../../lib/domain/portfolio-overview";
import { calculatePortfolioStatistics } from "../../lib/domain/portfolio-statistics";

const projects = [{ id: "a", displayName: "Alpha", status: "live" as const, completed: 5, planned: 20, inProgress: 2, percent: 25, repositories: [] },
  { id: "b", displayName: "Beta", status: "planned" as const, completed: 0, planned: 0, inProgress: 0, percent: 0, repositories: [] }];
const overview: PortfolioOverviewData = { source: "database", projects, statistics: calculatePortfolioStatistics(projects) };

describe("project comparison", () => {
  it("compares planned work without presenting unplanned projects as complete", () => {
    render(<ProjectComparison overview={overview} />);
    const row = screen.getByRole("rowheader", { name: "Alpha" }).closest("tr")!;
    expect(within(row).getByText("15")).toBeInTheDocument();
    expect(within(row).getByRole("progressbar")).toHaveAttribute("aria-valuemax", "20");
    const unplanned = screen.getByRole("rowheader", { name: "Beta" }).closest("tr")!;
    expect(within(unplanned).getAllByText("N/A").length).toBeGreaterThan(0);
    expect(within(unplanned).queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it("applies the same search and lifecycle controls as the portfolio home", () => {
    render(<ProjectComparison overview={overview} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Lifecycle" }), { target: { value: "live" } });
    expect(screen.queryByRole("rowheader", { name: "Beta" })).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 2 projects")).toBeInTheDocument();
  });
  it("reports data failure independently of an empty or filtered comparison", () => {
    render(<ProjectComparison overview={{ ...overview, source: "error", projects: [] }} />);
    expect(screen.getByText("Portfolio data is unavailable. Refresh to try again.")).toBeInTheDocument();
  });
  it("does not turn nine merged PRs among ten mapped PRs into 90% of a 100-PR plan", () => {
    const partial = {
      id: "hundred", displayName: "Hundred Item Plan", status: "active-development" as const,
      planned: 100, completed: 9, inProgress: 1, completionMeasured: false,
      percent: 9, repositories: []
    };
    render(<ProjectComparison overview={{ source: "database", projects: [partial], statistics: calculatePortfolioStatistics([partial]) }} />);
    const row = screen.getByRole("rowheader", { name: "Hundred Item Plan" }).closest("tr")!;
    const bar = within(row).getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "9");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(within(row).getByText("9%")).toBeInTheDocument();
    expect(within(row).getByText("91")).toBeInTheDocument();
  });

});
