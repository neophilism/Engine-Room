import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("portfolio home", () => {
  it("renders Engine Room first in the portfolio", () => {
    const { container } = render(<Home />);
    const names = container.querySelectorAll(".project-row strong");
    expect(names[0]).toHaveTextContent("Engine Room");
  });

  it("shows the target merged state for PR 2", () => {
    render(<Home />);
    expect(screen.getByText("2/40 PRs")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Engine Room roadmap progress" }))
      .toHaveAttribute("aria-valuenow", "2");
  });
});
