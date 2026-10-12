import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlannedProgressTube } from "./planned-progress-tube";
import { summarizePlannedProgress } from "../../lib/domain/planned-progress";

describe("unified development plan progress bar", () => {
  it("fills 9% green for 9 merged milestones out of 100 planned", () => {
    const progress = summarizePlannedProgress({ planned:100,completed:9 })!;
    const {container}=render(<PlannedProgressTube label="Sample roadmap" progress={progress}/>);
    expect(screen.getByRole("progressbar",{name:"Sample roadmap"})).toHaveAttribute("aria-valuemax","100");
    expect(screen.getByRole("progressbar",{name:"Sample roadmap"})).toHaveAttribute("aria-valuenow","9");
    expect(container.querySelector(".planned-progress-endcap")).not.toBeInTheDocument();
    expect(container.querySelector(".planned-progress-merged-fill")).toHaveStyle({width:"9%"});
    expect(container.querySelector(".planned-progress-open-fill")).toHaveStyle({left:"9%",width:"0%"});
  });

  it("fills 60% green then 10% yellow then 30% empty for 60 merged and 10 open",()=>{
    const progress=summarizePlannedProgress({planned:100,completed:60,inProgress:10})!;
    const {container}=render(<PlannedProgressTube label="Entire roadmap" progress={progress}/>);
    const tube=screen.getByRole("progressbar",{name:"Entire roadmap"});
    expect(tube).toHaveAttribute("aria-valuenow","60");
    expect(tube).toHaveAttribute("aria-valuemax","100");
    expect(tube).toHaveAttribute("aria-valuetext",
      "60 accepted and merged, 10 underway or awaiting acceptance, 30 not started; 100 planned units total");
    expect(container.querySelector(".planned-progress-merged-fill")).toHaveStyle({width:"60%"});
    expect(container.querySelector(".planned-progress-open-fill")).toHaveStyle({left:"60%",width:"10%"});
  });

  it("never uses source-age colors for merged added work",()=>{
    const progress=summarizePlannedProgress({
      planned:50,completed:50,sourcePlan:{
        original:50,originalComplete:50,added:50,addedComplete:10,
        unmapped:40,items:[],documents:[]
      }
    })!;
    const {container}=render(<PlannedProgressTube label="Expanded" progress={progress}/>);
    const tube=screen.getByRole("progressbar",{name:"Expanded"});
    expect(tube).toHaveAttribute("aria-valuenow","60");
    expect(tube).toHaveAttribute("aria-valuemax","100");
    expect(container.querySelector(".planned-progress-merged-fill")).toHaveStyle({width:"60%"});
    expect(container.querySelector(".planned-progress-open-fill")).toHaveStyle({left:"60%",width:"0%"});
    expect(container.querySelector(".planned-progress-added-fill")).not.toBeInTheDocument();
    expect(container.querySelector(".planned-progress-original-fill")).not.toBeInTheDocument();
  });
});
