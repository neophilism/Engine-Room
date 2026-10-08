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
    expect(screen.getByText("35% complete")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
  });
  it("does not label an empty portfolio complete", () => {
    render(<PortfolioProgressMachine projects={[]} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("No approved roadmap work is available yet.")).toBeInTheDocument();
  });
});
