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
  {id:"one",name:"Example Engine",repositories:["org/engine"],days:[{day:"2026-10-15",merges:3}]},
  {id:"two",name:"Second Service",repositories:["org/service"],days:[]}
 ]
};
describe("development velocity dashboard",()=>{
  it("renders all tracked projects and a zero-merge project, without a network request",()=>{
    render(<DevelopmentVelocity data={data}/>);
    expect(screen.getByText("Development velocity")).toBeInTheDocument();
    expect(screen.getAllByText("Example Engine").length).toBeGreaterThan(0);
    expect(screen.getByText("Second Service")).toBeInTheDocument();
    expect(screen.getByLabelText("Project development velocity")).toHaveValue("portfolio");
    expect(screen.getByRole("img",{name:/Entire portfolio development history/})).toBeInTheDocument();
    expect(screen.getByText(/manual Refresh updates this graph/)).toBeInTheDocument();
    expect(screen.getByText(/Not activated yet/)).toBeInTheDocument();
  });
  it("switches a selected project and changes time windows in the graph",()=>{
    render(<DevelopmentVelocity data={data}/>);
    fireEvent.change(screen.getByLabelText("Project development velocity"),{target:{value:"one"}});
    expect(screen.getByLabelText("Project development velocity")).toHaveValue("one");
    fireEvent.change(screen.getByLabelText("Velocity time window"),{target:{value:"90"}});
    fireEvent.change(screen.getByLabelText("Velocity graph measure"),{target:{value:"cumulative"}});
    expect(screen.getByRole("img",{name:/Example Engine development history/})).toBeInTheDocument();
  });
  it("shows honest unavailable state rather than artificial zero history",()=>{
    render(<DevelopmentVelocity data={{...data,source:"error",projects:[]}}/>);
    expect(screen.getByText(/Merge history unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole("img",{name:/development history/i})).not.toBeInTheDocument();
  });
});
