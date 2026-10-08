import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortfolioBrowser } from "./portfolio-browser";

const projects = [{ id: "a", displayName: "Alpha", status: "live" as const, completed: 10, planned: 10, inProgress: 0, percent: 100, repositories: [] },
  { id: "b", displayName: "Beta", status: "planned" as const, completed: 0, planned: 10, inProgress: 0, percent: 0, repositories: [] }];

describe("portfolio controls", () => {
  it("filters rows, reports matches, and can clear a no-match search", () => {
    render(<PortfolioBrowser projects={projects} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "Beta" } });
    expect(screen.queryByRole("button", { name: "Expand Alpha" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand Beta" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Lifecycle" }), { target: { value: "live" } });
    expect(screen.getByText("No projects match these filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Showing 2 of 2 projects")).toBeInTheDocument();
  });
});
