import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortfolioProgressMachine } from "./portfolio-progress-machine";

describe("portfolio progress machine", () => {
  it("renders a semantic progress instrument with the approved denominator", () => {
    render(<PortfolioProgressMachine projects={[{ id: "p", displayName: "Project", status: "active-development", completed: 7, inProgress: 2, planned: 20, percent: 35, repositories: [] }]} />);
    const tube = screen.getByRole("progressbar", { name: "Total portfolio roadmap progress" });
    expect(tube).toHaveAttribute("aria-valuenow", "7");
    expect(tube).toHaveAttribute("aria-valuemax", "20");
    expect(screen.getByText("35% full-scope complete")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
  });
  it("shows the unified 60 merged, 10 open, 30 unstarted portfolio summary", () => {
    render(<PortfolioProgressMachine projects={[{
      id:"a",displayName:"100-item plan",status:"active-development",completed:60,
      inProgress:10,planned:100,percent:60,repositories:[]
    }]} />);
    const bar=screen.getByRole("progressbar",{name:"Total portfolio roadmap progress"});
    expect(bar).toHaveAttribute("aria-valuenow","60");
    expect(bar).toHaveAttribute("aria-valuemax","100");
    expect(bar).toHaveAttribute("aria-valuetext",
      "60 full-scope packages complete, 10 packages in progress, 30 not started; 100 planned packages total");
    expect(screen.getByText("60% full-scope complete")).toBeInTheDocument();
    expect(screen.getByText("60 full packages · 10 underway · 30 not started")).toBeInTheDocument();
  });

  it("does not label an empty portfolio complete", () => {
    render(<PortfolioProgressMachine projects={[]} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("No approved roadmap work is available yet.")).toBeInTheDocument();
  });
  it("fills nine of 100 units despite incomplete GitHub PR mapping", () => {
    const project = { id: "p", displayName: "100 items", status: "active-development" as const,
      planned: 100, completed: 9, percent: 9, inProgress: 1, completionMeasured: false, repositories: [] };
    render(<PortfolioProgressMachine projects={[project]} />);
    const tube = screen.getByRole("progressbar", { name: "Total portfolio roadmap progress" });
    expect(tube).toHaveAttribute("aria-valuenow", "9");
    expect(tube).toHaveAttribute("aria-valuemax", "100");
    expect(screen.getByText("9% full-scope complete")).toBeInTheDocument();
  });

});
