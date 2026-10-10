import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectDashboard } from "./project-dashboard";

vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));

describe("project dashboard surface", () => {
  it("keeps an unplanned project unmeasured and provides navigation", () => {
    render(<ProjectDashboard data={{ source: "database", project: { id: "p", slug: "project", displayName: "Project", status: "planned" }, repositories: [], milestones: [] }} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Project");
    expect(screen.getByText("No approved development plan has been registered.")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Compare projects" })).toHaveAttribute("href", "/projects");
  });
});
