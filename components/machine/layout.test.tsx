import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlowStation, MachineFlow, MachineGrid, MachineManifold } from ".";

describe("responsive machine layout", () => {
  it("builds a semantic sequential flow with one connector between stations", () => {
    const { container } = render(
      <MachineFlow label="Release path">
        <FlowStation title="Build" />
        <FlowStation title="Review" />
        <FlowStation title="Production" />
      </MachineFlow>
    );

    expect(screen.getByRole("group", { name: "Release path" })).toHaveAttribute("data-flow-count", "3");
    expect(container.querySelectorAll(".machine-flow-connector")).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Build" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Production" })).toBeInTheDocument();
  });

  it("renders both desktop and mobile connector paths for CSS-driven rerouting", () => {
    const { container } = render(
      <MachineFlow label="Responsive path">
        <FlowStation title="One" />
        <FlowStation title="Two" />
      </MachineFlow>
    );

    expect(container.querySelector(".machine-flow-pipe-desktop")).toBeInTheDocument();
    expect(container.querySelector(".machine-flow-pipe-mobile")).toBeInTheDocument();
  });

  it("fans multiple inputs into one manifold output", () => {
    render(
      <MachineManifold
        label="Cost aggregation"
        inputs={[
          { id: "hosting", label: "Hosting", content: "$120" },
          { id: "api", label: "API", content: "$80", state: "warning" }
        ]}
        output={<strong>$200</strong>}
        outputLabel="Total spend"
      />
    );

    expect(screen.getByRole("group", { name: "Cost aggregation" })).toHaveAttribute("data-input-count", "2");
    expect(screen.getByRole("region", { name: "Hosting" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "API" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Total spend" })).toHaveTextContent("$200");
  });

  it("exposes responsive grid column intent without viewport JavaScript", () => {
    render(
      <MachineGrid columns={4} label="KPI bank">
        <span>One</span>
        <span>Two</span>
      </MachineGrid>
    );

    expect(screen.getByRole("group", { name: "KPI bank" })).toHaveAttribute("data-columns", "4");
  });
});
