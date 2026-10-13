import React from "react";
import {render,screen} from "@testing-library/react";
import {describe,expect,it} from "vitest";
import {TimeProgressTube} from "./time-progress-tube";
import {DualProgress} from "./dual-progress";
import {estimateTimeCompletion} from "../../lib/domain/time-completion";
import {summarizePlannedProgress} from "../../lib/domain/planned-progress";

const at=(day:number)=>new Date(Date.parse("2026-10-01T00:00:00Z")+day*86400000).toISOString();
const forecast=estimateTimeCompletion({planned:10,completed:5},{
  startedAt:at(0),startBasis:"repository-created",syncedAt:at(10),
  accepted:[2,4,6,8,10].map(d=>({openedAt:at(d-0.5),completedAt:at(d)}))
},at(11));
describe("time progress is an independent accessible bar",()=>{
  it("renders two bars with different units and named completion models",()=>{
    const progress=summarizePlannedProgress({planned:10,completed:5})!;
    const {container}=render(<DualProgress progress={progress} forecast={forecast}
      workLabel="Roadmap units" timeLabel="Calendar duration"/>);
    const work=screen.getByRole("progressbar",{name:"Roadmap units"});
    const time=screen.getByRole("progressbar",{name:"Calendar duration"});
    expect(work).toHaveAttribute("aria-valuemax","10");
    expect(time).toHaveAttribute("aria-valuemax","100");
    expect(time).toHaveAttribute("aria-valuetext",expect.stringContaining("calendar"));
    expect(container.querySelector(".planned-progress-tube")).toBeInTheDocument();
    expect(container.querySelector(".time-progress-tube")).toBeInTheDocument();
    expect(screen.getByText(/Calendar pace:/)).toBeInTheDocument();
    expect(screen.getByText(/PR-cycle pace:/)).toBeInTheDocument();
  });
  it("does not render a false 0%-complete time progressbar if observations are absent",()=>{
    const {container}=render(<TimeProgressTube label="Unknown project ETA"/>);
    expect(screen.queryByRole("progressbar",{name:"Unknown project ETA"})).not.toBeInTheDocument();
    expect(screen.getByRole("status",{name:"Unknown project ETA: estimate unavailable"})).toBeInTheDocument();
    expect(container.querySelector(".time-progress-unmeasured")).toBeInTheDocument();
  });
  it("provides 100% calendar time when roadmap is fully complete",()=>{
    const complete=estimateTimeCompletion({planned:2,completed:2},null,at(11));
    render(<TimeProgressTube label="Completed project time" forecast={complete}/>);
    expect(screen.getByRole("progressbar",{name:"Completed project time"})).toHaveAttribute("aria-valuenow","100");
    expect(screen.getByText("100.0% of forecast duration")).toBeInTheDocument();
  });
});
