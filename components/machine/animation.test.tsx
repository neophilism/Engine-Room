import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlowStation, Gauge, GlassTube, IndicatorLamp, Machine, MachineFlow, MachineManifold, Pipe } from ".";
import { machineStates, type MachineState } from "../../lib/design/theme";

describe("machine state composition", () => {
  function Instruments({ state, value }: { state: MachineState; value: number }) {
    return (
      <Machine label="Release machine" state={state}>
        <Gauge label="Release readiness" value={value} max={100} unit="%" />
        <GlassTube label="Merged work" value={value} max={100} />
        <IndicatorLamp label="Release status" />
        <IndicatorLamp label="Disconnected source" state="offline" />
        <MachineFlow label="Release path">
          <FlowStation title="Build" />
          <FlowStation title="Deploy" />
        </MachineFlow>
        <MachineManifold
          label="Sources"
          inputs={[{ id: "ci", label: "CI", content: "Build result" }, { id: "scan", label: "Scan", content: "Finding", state: "warning" }]}
          output={<span>Summary</span>}
          outputLabel="Release summary"
        />
      </Machine>
    );
  }

  it.each(machineStates)("propagates %s, retaining explicit source overrides and semantic status", (state) => {
    const { container } = render(<Instruments state={state} value={42} />);
    expect(screen.getByRole("group", { name: "Release machine" })).toHaveAttribute("data-state", state);
    expect(screen.getByRole("status")).toHaveTextContent(`Release machine: ${state[0].toUpperCase()}${state.slice(1)}`);
    expect(screen.getByRole("meter")).toHaveAttribute("data-state", state);
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-state", state);
    expect(screen.getByRole("group", { name: "Release path" })).toHaveAttribute("data-state", state);
    expect(screen.getByRole("region", { name: "Build" })).toHaveAttribute("data-state", state);
    expect(screen.getByRole("img", { name: "Disconnected source: Offline" })).toHaveAttribute("data-state", "offline");
    expect(screen.getByRole("img", { name: "Scan: Warning" })).toHaveAttribute("data-state", "warning");
    const flowPipes = container.querySelectorAll(".machine-flow .machine-pipe");
    expect(flowPipes).toHaveLength(2);
    flowPipes.forEach((pipe) => {
      expect(pipe).toHaveAttribute("data-state", state);
      expect(pipe).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("updates values and status immediately without remounting instruments or routing", () => {
    const { rerender, container } = render(<Instruments state="active" value={25} />);
    const meter = screen.getByRole("meter");
    const tube = screen.getByRole("progressbar");
    const connector = container.querySelector(".machine-flow-connector");
    rerender(<Instruments state="complete" value={100} />);
    expect(screen.getByRole("meter")).toBe(meter);
    expect(screen.getByRole("progressbar")).toBe(tube);
    expect(container.querySelector(".machine-flow-connector")).toBe(connector);
    expect(meter).toHaveAttribute("aria-valuenow", "100");
    expect(meter.style.getPropertyValue("--gauge-angle")).toBe("120deg");
    expect(tube.style.getPropertyValue("--machine-fill")).toBe("100%");
    expect(screen.getByRole("status")).toHaveTextContent("Complete");
    rerender(<Instruments state="offline" value={0} />);
    expect(meter.style.getPropertyValue("--machine-state-glow")).toBe("none");
    expect(tube).toHaveAttribute("aria-valuenow", "0");
  });

  it("keeps nested machines independent", () => {
    render(<Machine label="Outer" state="blocked"><Machine label="Inner" state="live"><Pipe label="Inner pipe" /></Machine><Pipe label="Outer pipe" /></Machine>);
    expect(screen.getByRole("img", { name: "Inner pipe" })).toHaveAttribute("data-state", "live");
    expect(screen.getByRole("img", { name: "Outer pipe" })).toHaveAttribute("data-state", "blocked");
  });
});

