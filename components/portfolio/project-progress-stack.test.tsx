import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectProgressStack } from "./project-progress-stack";

const project = {
  id: "project",
  displayName: "Multi Repo",
  status: "active-development" as const,
  completed: 4,
  inProgress: 1,
  planned: 10,
  percent: 40,
  repositories: [
    {
      id: "core",
      fullName: "owner/core",
      htmlUrl: "https://github.com/owner/core",
      completed: 3,
      inProgress: 1,
      planned: 6,
      percent: 50
    },
    {
      id: "web",
      fullName: "owner/web",
      htmlUrl: "https://github.com/owner/web",
      completed: 1,
      inProgress: 0,
      planned: 4,
      percent: 25
    }
  ]
};

describe("ProjectProgressStack", () => {
  it("renders a stacked progress tube and PR count for every repository", () => {
    render(<ProjectProgressStack project={project} />);

    expect(screen.getByText("owner/core")).toBeInTheDocument();
    expect(screen.getByText("owner/web")).toBeInTheDocument();
    expect(screen.getByText("3/6 PRs")).toBeInTheDocument();
    expect(screen.getByText("1/4 PRs")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "owner/core roadmap progress" })
    ).toHaveAttribute("aria-valuenow", "3");
  });

  it("toggles the project drawer with accessible expansion state", () => {
    render(<ProjectProgressStack project={project} />);

    const button = screen.getByRole("button", { name: "Expand Multi Repo" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(button.getAttribute("aria-controls")!))
      .toHaveAttribute("inert");
    expect(screen.getByText("Lifecycle").closest(".project-expansion-drawer"))
      .toHaveAttribute("aria-hidden", "true");

    fireEvent.click(button);

    const collapse = screen.getByRole("button", { name: "Collapse Multi Repo" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(collapse.getAttribute("aria-controls")!))
      .not.toHaveAttribute("inert");
    expect(screen.getByText("Lifecycle").closest(".project-expansion-drawer"))
      .toHaveAttribute("aria-hidden", "false");
    expect(screen.getByText("active-development")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });
});
