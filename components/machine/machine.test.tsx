import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrassPanel, Gauge, GlassTube, IndicatorLamp, Pipe, Valve } from ".";

describe("machine component library", () => {
  it("renders a brass panel with machine heading content", () => {
    render(<BrassPanel eyebrow="Live roadmap" title="Portfolio progress"><p>Machine content</p></BrassPanel>);
    expect(screen.getByRole("region", { name: "Portfolio progress" })).toBeInTheDocument();
    expect(screen.getByText("Machine content")).toBeInTheDocument();
  });

  it("exposes glass tube progress semantics while clamping visual fill", () => {
    render(<GlassTube value={12} max={10} label="Overfilled test" />);
    const tube = screen.getByRole("progressbar", { name: "Overfilled test" });
    expect(tube).toHaveAttribute("aria-valuenow", "12");
    expect(tube.style.getPropertyValue("--machine-fill")).toBe("100%");
  });

  it("exposes lamp state in its accessible label", () => {
    render(<IndicatorLamp state="warning" label="Deployment" />);
    expect(screen.getByRole("img", { name: "Deployment: Warning" })).toHaveAttribute("data-state", "warning");
  });

  it("renders an accessible instrument gauge", () => {
    render(<Gauge value={75} max={100} label="Release readiness" unit="%" />);
    const meter = screen.getByRole("meter", { name: "Release readiness" });
    expect(meter).toHaveAttribute("aria-valuenow", "75");
    expect(meter).toHaveAttribute("aria-valuetext", "75%");
  });

  it("lets a valve request a controlled state change", () => {
    const onChange = vi.fn();
    render(<Valve label="Release gate" open={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Release gate: closed" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("keeps decorative pipes hidden and labels meaningful pipes", () => {
    const { rerender, container } = render(<Pipe shape="horizontal" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    rerender(<Pipe shape="elbow-se" state="live" label="Deployment flow" />);
    expect(screen.getByRole("img", { name: "Deployment flow" })).toHaveAttribute("data-state", "live");
  });
});
