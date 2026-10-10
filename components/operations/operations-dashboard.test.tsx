import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OperationsDashboard } from "./operations-dashboard";

describe("operations dashboard", () => {
  it("shows missing measurements as unknown rather than zero or healthy", () => {
    render(<OperationsDashboard overview={{ source: "database", projects: [{ id: "p", slug: "project", displayName: "Project" }], samples: [] }} evaluatedAt="2026-10-08T00:00:00Z" />);
    const row = screen.getByRole("rowheader", { name: "Project" }).closest("tr")!;
    expect(screen.getByRole("columnheader", { name: "Worker presence" })).toBeInTheDocument();
    expect(within(row).getAllByText("Unknown")).toHaveLength(7);
    expect(within(row).queryByText("0%")).not.toBeInTheDocument();
  });
});
