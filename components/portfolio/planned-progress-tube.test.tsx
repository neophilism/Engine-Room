import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlannedProgressTube } from "./planned-progress-tube";
import { summarizePlannedProgress } from "../../lib/domain/planned-progress";

describe("source-plan progress tube", () => {
  it("fills only 9% of a 100-item plan, not 90%", () => {
    const progress = summarizePlannedProgress({ planned: 100, completed: 9 })!;
    const { container } = render(<PlannedProgressTube label="Sample roadmap" progress={progress} />);
    expect(screen.getByRole("progressbar", { name: "Sample roadmap" })).toHaveAttribute("aria-valuemax", "100");
    expect(screen.getByRole("progressbar", { name: "Sample roadmap" })).toHaveAttribute("aria-valuenow", "9");
    expect(container.querySelector(".planned-progress-original-fill")).toHaveStyle({ width: "9%" });
    expect(container.querySelector(".planned-progress-added-fill")).not.toBeInTheDocument();
  });
  it("keeps addition fill separate and only fills verified completed added work", () => {
    const progress = summarizePlannedProgress({ planned: 40, completed: 40,
      sourcePlan: { original:40,originalComplete:40,added:60,addedComplete:9,unmapped:51,items:[],documents:[] } })!;
    const { container } = render(<PlannedProgressTube label="Entire roadmap" progress={progress} />);
    const tube = screen.getByRole("progressbar", { name: "Entire roadmap" });
    expect(tube).toHaveAttribute("aria-valuenow", "49");
    expect(tube).toHaveAttribute("aria-valuemax", "100");
    expect(container.querySelector(".planned-progress-original-fill")).toHaveStyle({width:"40%"});
    expect(container.querySelector(".planned-progress-added-fill")).toHaveStyle({left:"40%",width:"9%"});
  });
});
