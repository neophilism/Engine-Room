import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LifecycleLanes } from "./lifecycle-lanes";

describe("lifecycle stage controls", () => {
  it("filters on a stage and toggles the selected stage back to all", () => {
    const onSelect = vi.fn();
    const props = { projects: [], selectedStatus: "all" as const, onSelect };
    const { rerender } = render(<LifecycleLanes {...props} />);
    const button = screen.getByRole("button", { name: "Filter Live: 0 projects" });
    fireEvent.click(button);
    expect(onSelect).toHaveBeenLastCalledWith("live");
    rerender(<LifecycleLanes {...props} selectedStatus="live" />);
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(onSelect).toHaveBeenLastCalledWith("all");
  });
});
