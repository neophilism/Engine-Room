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
    expect(screen.getByText("3/6 planned")).toBeInTheDocument();
    expect(screen.getByText("1/4 planned")).toBeInTheDocument();
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
  it("shows 9/100, not 9/10, when 90 planned units lack a GitHub PR mapping", () => {
    const partial = {
      ...project, id: "partial", displayName: "Hundred Item Plan",
      planned: 100, completed: 9, inProgress: 1, percent: 9, completionMeasured: false,
      repositories: [{ ...project.repositories[0], id: "partially-mapped", planned: 10, completed: 9, percent: 90 }]
    };
    render(<ProjectProgressStack project={partial} />);
    expect(screen.getAllByText(/9\/100 packages mapped to merged PRs/).length).toBeGreaterThan(0);
    expect(screen.getByText("9%")).toBeInTheDocument();
    const tube = screen.getByRole("progressbar", { name: "Hundred Item Plan development plan progress" });
    expect(tube).toHaveAttribute("aria-valuemax", "100");
    expect(tube).toHaveAttribute("aria-valuenow", "9");
    expect(tube.closest("details")).toBeNull();
    expect(screen.getByText("9/100 planned")).toBeInTheDocument();
    expect(screen.queryByText("90%")).not.toBeInTheDocument();
  });

  it("shows one bar with 60 merged, 10 open, 30 unstarted after the plan expands", () => {
    const mixed = {
      ...project, id:"expanded", displayName:"Expanded Project",
      planned:50, completed:50, inProgress:10,
      repositories:[{...project.repositories[0], id:"whole", planned:50, completed:50}],
      sourcePlan:{
        original:50,originalComplete:50,added:50,addedComplete:10,
        unmapped:30,items:[],documents:[]
      }
    };
    render(<ProjectProgressStack project={mixed} />);
    const bar=screen.getByRole("progressbar",{name:"Expanded Project development plan progress"});
    expect(bar).toHaveAttribute("aria-valuenow","60");
    expect(bar).toHaveAttribute("aria-valuemax","100");
    expect(bar).toHaveAttribute("aria-valuetext",
      "60 packages mapped to merged PRs, 10 with linked PR activity, 30 without a verified full-scope merge mapping; 100 planned packages total");
    expect(screen.getAllByText(/60\/100 packages mapped to merged PRs/)).toHaveLength(1);
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(bar.closest("details")).toBeNull();
    expect(screen.queryByText(/Original 50\/50/)).not.toBeInTheDocument();
  });

  it("does not label Smart Cities merged-but-unmapped work as unstarted", () => {
    const missing = {
      ...project,
      id: "smart", displayName: "Smart Cities",
      planned: 30, completed: 0, inProgress: 0,
      repositories: [{...project.repositories[0], id:"smart-repo", planned:30,completed:0,inProgress:0}],
      activity: { total:26, open:0, merged:26, drafts:0, failedChecks:0, runningChecks:0, lastObservedAt:null },
      sourcePlan: {
        original:30, originalComplete:0, added:0, addedComplete:0, unmapped:30, items:[],
        documents:[{path:"registry/prs.json",url:"https://github.com/neophilism/Smart-Cities-Surveillance-Registry",
          title:"Structured PR registry",importedAt:"2026-10-11T18:03:05.869Z",versions:1}]
      }
    };
    render(<ProjectProgressStack project={missing} />);
    expect(screen.getByText(/30 packages lack a verified full-scope merge mapping/)).toBeInTheDocument();
    expect(screen.getByText(/0 mapped to merged PRs/)).toBeInTheDocument();
    expect(screen.getByText(/26 GitHub PRs accepted \(merged\)/)).toBeInTheDocument();
    expect(screen.queryByText(/30 not started/)).not.toBeInTheDocument();
  });

  it("shows real merged activity when a private/unpublished plan cannot be scored", () => {
    const unpublished = {
      ...project, id:"cornerstone", displayName:"The Cornerstone",
      planned:0,completed:0,inProgress:0,repositories:[],
      activity: {total:11,open:0,merged:11,drafts:0,failedChecks:0,runningChecks:0,lastObservedAt:null},
      sourcePlan:{original:0,originalComplete:0,added:0,addedComplete:0,unmapped:0,items:[],
        documents:[{path:"registry/prs.json",url:"https://github.com/neophilism/The-Cornerstone",
          title:"Unverified source",importedAt:"2026-10-11T18:03:06.242Z",versions:1}]}
    };
    render(<ProjectProgressStack project={unpublished} />);
    expect(screen.getByText(/Plan unverified · 11 GitHub PRs accepted \(merged\)/)).toBeInTheDocument();
    expect(screen.getByText(/Planning records · plan unavailable/)).toBeInTheDocument();
  });

  it("does not infer added planned work from an unrelated open GitHub PR", () => {
    const mapped = {
      ...project, id: "original-complete", displayName: "Original Done",
      planned: 10, completed: 10, inProgress: 1, percent: 100,
      repositories: [{ ...project.repositories[0], planned: 10, completed: 10, percent: 100 }]
    };
    render(<ProjectProgressStack project={mapped} />);
    expect(screen.getAllByText(/10\/10 packages mapped to merged PRs/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/1 open GitHub PR/)).not.toBeInTheDocument();
  });

});
