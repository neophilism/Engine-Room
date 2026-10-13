import {describe,expect,it} from "vitest";
import {timeEvidenceFromPlan} from "./time-evidence";
import type {SourcePlanSummary} from "../domain/live-monitor";

describe("approved-plan ETA evidence scoping",()=>{
  const plan:SourcePlanSummary={
    original:3,originalComplete:2,added:0,addedComplete:0,unmapped:0,documents:[],
    items:[
      {ordinal:1,title:"A",scope:"original",numbers:[1],state:"merged",reason:null,sourceUrl:"source-a",
        repositoryFullName:"org/a",openedAt:"2026-10-01T00:00:00Z",completedAt:"2026-10-03T00:00:00Z"},
      {ordinal:2,title:"B",scope:"original",numbers:[2],state:"merged",reason:null,sourceUrl:"source-b",
        repositoryFullName:"org/b",openedAt:"2026-10-01T00:00:00Z",completedAt:"2026-10-03T10:00:00Z"},
      {ordinal:3,title:"C",scope:"original",numbers:[],contributingNumbers:[4],state:"in-progress",reason:null,sourceUrl:"source-b",
        repositoryFullName:"org/b",openedAt:"2026-10-02T00:00:00Z",completedAt:"2026-10-04T00:00:00Z"}
    ]
  };
  const origin={startedAt:"2026-10-01T00:00:00Z",startBasis:"repository-created" as const,syncedAt:"2026-10-05T00:00:00Z"};
  it("only counts accepted units from the specified repository",()=>{
    const a=timeEvidenceFromPlan(plan,origin,"org/a");
    const b=timeEvidenceFromPlan(plan,origin,"org/b");
    expect(a.accepted).toEqual([{openedAt:"2026-10-01T00:00:00Z",completedAt:"2026-10-03T00:00:00Z"}]);
    expect(b.accepted).toHaveLength(1);
    expect(b.accepted[0].completedAt).toBe("2026-10-03T10:00:00Z");
    expect(timeEvidenceFromPlan(plan,origin).accepted).toHaveLength(2);
  });
  it("never counts merged contributing PR activity as accepted package completion",()=>{
    expect(timeEvidenceFromPlan({...plan,items:[plan.items[2]]},origin).accepted).toHaveLength(0);
  });
});
