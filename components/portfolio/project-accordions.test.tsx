import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectAccordions } from "./project-accordions";

const project = {
  id: "project",
  displayName: "Engine Room",
  summary: "A live executive portfolio control room.",
  status: "active-development" as const,
  completed: 19,
  inProgress: 1,
  planned: 40,
  percent: 47.5,
  repositories: []
};

describe("ProjectAccordions", () => {
  it("renders Summary, Features, and At a Glance surfaces", () => {
    render(<ProjectAccordions project={project} />);

    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("At a Glance")).toBeInTheDocument();
    expect(
      screen.getByText("A live executive portfolio control room.")
    ).toBeInTheDocument();
    expect(screen.getByText("active-development")).toBeInTheDocument();
  });

  it("is explicit when structured feature or summary data is absent", () => {
    render(<ProjectAccordions project={{ ...project, summary: undefined }} />);

    expect(
      screen.getByText("No project summary has been registered yet.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No structured feature records have been registered for this project yet."
      )
    ).toBeInTheDocument();
  });
});
