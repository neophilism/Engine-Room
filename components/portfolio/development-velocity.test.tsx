import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DevelopmentVelocity } from "./development-velocity";
import type { DevelopmentVelocityData } from "../../lib/domain/development-velocity";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
const data:DevelopmentVelocityData={
 source:"database",
 observedAt:"2026-10-16T21:10:00Z",
 latestSuccessfulSyncAt:"2026-10-16T21:08:00Z",
 oldestSuccessfulSyncAt:"2026-10-16T20:00:00Z",
 trackedRepositories:2,synchronizedRepositories:2,boardroomStartDate:null,
 projects:[
  {id:"one",name:"Example Engine",repositories:["org/engine"],
   lifetime:{startedOn:"2026-10-14",mergedPrs:3,startSource:"github",undatedRepositories:0},days:[{day:"2026-10-15",merges:3}]},
  {id:"two",name:"Second Service",repositories:["org/service"],
   lifetime:{startedOn:"2026-10-12",mergedPrs:0,startSource:"github",undatedRepositories:0},days:[]}
 ]
};
describe("development velocity dashboard",()=>{
  it("renders all tracked projects and a zero-merge project, without a network request",()=>{
    render(<DevelopmentVelocity data={data}/>);
    expect(screen.getByText("Development velocity")).toBeInTheDocument();
    expect(screen.getAllByText("Example Engine").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Second Service").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Project development velocity")).toHaveValue("portfolio");
    expect(screen.getByRole("img",{name:/Entire portfolio development history/})).toBeInTheDocument();
    expect(screen.getByText(/manual Refresh updates this graph/)).toBeInTheDocument();
    expect(screen.getByText(/Not activated yet/)).toBeInTheDocument();
  });
  it("shows all-time PRs/day for the selected portfolio and every individual project",()=>{
    render(<DevelopmentVelocity data={data}/>);
    // Two repositories: 3 lifetime merges since Oct 12 inclusive (5 days).
    expect(screen.getByTestId("velocity-lifetime-prs-per-day")).toHaveTextContent("0.60");
    expect(screen.getByLabelText("Entire portfolio lifetime merged PRs per day")).toBeInTheDocument();
    expect(screen.getByText(/3 merged PRs ÷ 5 UTC calendar days/)).toBeInTheDocument();
    expect(screen.getByRole("columnheader",{name:"Lifetime PRs/day"})).toBeInTheDocument();
    expect(screen.getByRole("row",{name:/Example Engine/})).toHaveTextContent("1.00");
    expect(screen.getByRole("row",{name:/Second Service/})).toHaveTextContent("0.00");
    fireEvent.change(screen.getByLabelText("Project development velocity"),{target:{value:"one"}});
    expect(screen.getByTestId("velocity-lifetime-prs-per-day")).toHaveTextContent("1.00");
    expect(screen.getByText(/3 merged PRs ÷ 3 UTC calendar days/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Project development velocity"),{target:{value:"two"}});
    expect(screen.getByTestId("velocity-lifetime-prs-per-day")).toHaveTextContent("0.00");
  });
  it("switches a selected project and changes time windows in the graph",()=>{
    render(<DevelopmentVelocity data={data}/>);
    fireEvent.change(screen.getByLabelText("Project development velocity"),{target:{value:"one"}});
    expect(screen.getByLabelText("Project development velocity")).toHaveValue("one");
    fireEvent.change(screen.getByLabelText("Velocity time window"),{target:{value:"90"}});
    fireEvent.change(screen.getByLabelText("Velocity graph measure"),{target:{value:"cumulative"}});
    expect(screen.getByRole("img",{name:/Example Engine development history/})).toBeInTheDocument();
  });

  it("excludes Boardroom's own merges from the portfolio adoption comparison",()=>{
    const benchmark:DevelopmentVelocityData={
      ...data, boardroomStartDate:"2026-10-08",
      projects:[
        {id:"boardroom",name:"Boardroom",repositories:["neophilism/Boardroom"],
          lifetime:{startedOn:"2026-10-06",mergedPrs:81,startSource:"github",undatedRepositories:0},
          days:[{day:"2026-10-07",merges:1},{day:"2026-10-15",merges:80}]},
        {id:"outside",name:"Outside Project",repositories:["neophilism/Outside-Project"],
          lifetime:{startedOn:"2026-10-04",mergedPrs:7,startSource:"github",undatedRepositories:0},
          days:[{day:"2026-10-07",merges:2},{day:"2026-10-15",merges:5}]}
      ]
    };
    render(<DevelopmentVelocity data={benchmark}/>);
    expect(screen.getByText(/all projects except Boardroom itself/i)).toBeInTheDocument();
    expect(screen.getByText(/2 PRs before/i)).toBeInTheDocument();
    expect(screen.getByText(/5 PRs after/i)).toBeInTheDocument();
  });
  it("shows honest unavailable state rather than artificial zero history",()=>{
    render(<DevelopmentVelocity data={{...data,source:"error",projects:[]}}/>);
    expect(screen.getByText(/Merge history unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole("img",{name:/development history/i})).not.toBeInTheDocument();
  });
});
