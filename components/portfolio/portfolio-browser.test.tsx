import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortfolioBrowser } from "./portfolio-browser";

const projects = [{ id: "a", displayName: "Alpha", status: "live" as const, completed: 10, planned: 10, inProgress: 0, percent: 100, repositories: [] },
  { id: "b", displayName: "Beta", status: "planned" as const, completed: 0, planned: 10, inProgress: 0, percent: 0, repositories: [] }];

describe("portfolio controls", () => {
  it("places the engine first and indents its entire implementation card", () => {
    const engine = { ...projects[0], id: "engine", slug: "civic-registry-transparency-engine", displayName: "Civic Registry Transparency Engine" };
    const child = { ...projects[1], id: "child", slug: "smart-cities-surveillance-registry", displayName: "Smart Cities Surveillance Registry" };
    const { container } = render(<PortfolioBrowser projects={[child, engine]} />);
    const headings = Array.from(container.querySelectorAll(".project-progress-heading"));
    expect(headings).toHaveLength(2);
    expect(headings[0].textContent).toContain("Civic Registry Transparency Engine");
    expect(headings[1].textContent).toContain("Smart Cities Surveillance Registry");
    expect(headings[0].closest("article")).toHaveAttribute("data-hierarchy-depth","0");
    expect(headings[1].closest("article")).toHaveAttribute("data-hierarchy-depth","1");
    expect(headings[1].querySelector(".count")).not.toHaveClass("project-name-indent");
    expect(headings[1].querySelector(".percentage")).not.toHaveClass("project-name-indent");
    expect(container.querySelector(".repository-progress-row")).not.toHaveClass("project-name-indent");
  });
  it("keeps Superintelligence applications nested below their engine", () => {
    const names=['Superintelligence-Academy','Superintelligence-Command-Center','Superintelligence-Engine'];
    const {container}=render(<PortfolioBrowser projects={names.map((name,i)=>({...projects[0],id:String(i),displayName:name,repositoryFullName:'neophilism/'+name}))}/>);
    const cards=Array.from(container.querySelectorAll('article.project-progress-stack'));
    expect(cards.map(card=>card.querySelector('strong')?.textContent)).toEqual([names[2],names[0],names[1]]);
    expect(cards.map(card=>card.getAttribute('data-hierarchy-depth'))).toEqual(['0','1','1']);
  });
  it("filters rows, reports matches, and can clear a no-match search", () => {
    render(<PortfolioBrowser projects={projects} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "Beta" } });
    expect(screen.queryByRole("button", { name: "Expand Alpha" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand Beta" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Lifecycle" }), { target: { value: "live" } });
    expect(screen.getByText("No projects match these filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Showing 2 of 2 projects")).toBeInTheDocument();
  });
});

