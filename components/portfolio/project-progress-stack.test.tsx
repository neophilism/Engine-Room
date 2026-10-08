import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectProgressStack } from "./project-progress-stack";

describe("ProjectProgressStack", () => {
  it("renders a stacked progress tube and PR count for every repository", () => {
    render(
      <ProjectProgressStack
        project={{
          id: "project",
          displayName: "Multi Repo",
          status: "active-development",
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
        }}
      />
    );

    expect(screen.getByText("owner/core")).toBeInTheDocument();
    expect(screen.getByText("owner/web")).toBeInTheDocument();
    expect(screen.getByText("3/6 PRs")).toBeInTheDocument();
    expect(screen.getByText("1/4 PRs")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "owner/core roadmap progress" })
    ).toHaveAttribute("aria-valuenow", "3");
  });
});
