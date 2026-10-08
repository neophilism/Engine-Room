import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectFeatures } from "./project-features";

describe("feature groups", () => {
  it("groups real records and explains an unlinked feature", () => {
    render(<ProjectFeatures features={[{ id: "one", projectId: "p", key: "one", title: "Complete feature", planned: 1, merged: 1, open: 0, status: "implemented" },
      { id: "two", projectId: "p", key: "two", title: "Unlinked feature", planned: 0, merged: 0, open: 0, status: "remaining" }]} />);
    expect(within(screen.getByRole("region", { name: "Implemented features" })).getByText("Complete feature")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Remaining features" })).getByText("Roadmap links pending")).toBeInTheDocument();
  });
});
