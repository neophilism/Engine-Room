import { describe, expect, it } from "vitest";
import { summarizePlannedProgress } from "./planned-progress";
import type { SourcePlanSummary } from "./live-monitor";

function plan(original: number, originalComplete: number, added = 0, addedComplete = 0): SourcePlanSummary {
  return { original, originalComplete, added, addedComplete,
    unmapped: original - originalComplete + added - addedComplete, items: [], documents: [] };
}

describe("unified planned-work completion and open-PR progress", () => {
  it("renders 9 merged of 100 as 9% green, not 90%", () => {
    expect(summarizePlannedProgress({ planned: 100, completed: 9, sourcePlan: plan(100, 9) }))
      .toMatchObject({ planned: 100, completed: 9, inProgress: 0, notStarted: 91, remaining: 91, percent: 9 });
  });

  it("renders exactly 60% green + 10% yellow + 30% empty, even with passing checks", () => {
    const progress = summarizePlannedProgress({
      planned: 100, completed: 60, inProgress: 10,
      activity: {open: 10}, sourcePlan: plan(100, 60)
    });
    expect(progress).toMatchObject({
      planned: 100, completed: 60, inProgress: 10, notStarted: 30, remaining: 40, percent: 60
    });
  });

  it("a completed 50-unit plan drops to half green when another 50 units are added", () => {
    expect(summarizePlannedProgress({ planned:50,completed:50,sourcePlan:plan(50,50) }))
      .toMatchObject({planned:50,completed:50,percent:100});
    const extended = summarizePlannedProgress({ planned:50,completed:50,sourcePlan:plan(50,50,50,0) });
    expect(extended).toMatchObject({
      planned:100,completed:50,inProgress:0,notStarted:50,remaining:50,percent:50
    });
  });

  it("a written PR in added scope is yellow, not green", () => {
    const extended = plan(50,50,50,10);
    extended.items = [{
      ordinal: 51, title: "New design", scope:"addition", numbers:[101],
      state:"in-progress", reason:null, sourceUrl:"https://github.com/neophilism/repo"
    }];
    expect(summarizePlannedProgress({planned:50,completed:50,sourcePlan:extended}))
      .toMatchObject({planned:100,completed:60,inProgress:1,notStarted:39,percent:60});
  });

  it("counts drafts and CI-pending open PRs without counting mapped work twice", () => {
    const partial=plan(100,60);
    partial.items=[{ordinal:90,title:"Testing",scope:"original",numbers:[11],
      state:"in-progress",reason:null,sourceUrl:"https://github.com/example/repo"}];
    expect(summarizePlannedProgress({planned:100,completed:60,inProgress:1,
      activity:{open:10},sourcePlan:partial}))
      .toMatchObject({inProgress:10,notStarted:30});
  });

  it("all plans use the same denominator even if the old approval table is smaller", () => {
    expect(summarizePlannedProgress({ planned: 40, completed: 9, sourcePlan: plan(100, 9, 10, 1) }))
      .toMatchObject({ planned:110,completed:10,remaining:100,percent:9.1 });
  });

  it("includes additions-only documents alongside an approved original plan", () => {
    expect(summarizePlannedProgress({ planned:40, completed:40, sourcePlan:plan(0,0,60,9) }))
      .toMatchObject({ planned:100,completed:49,notStarted:51,percent:49 });
  });

  it("does not invent unplanned scope from unrelated open PRs", () => {
    expect(summarizePlannedProgress({ planned:40, completed:40, inProgress:15,
      activity:{open:15} }))
      .toMatchObject({planned:40,completed:40,inProgress:0,notStarted:0,percent:100});
  });

  it("uses structured JSON as exact current scope and ignores stale unrelated open PRs", () => {
    const current=plan(16,16);
    current.items=Array.from({length:16},(_,i)=>({
      ordinal:i+1,title:"Approved MVA unit",scope:"original" as const,numbers:[i+1],
      state:"merged" as const,reason:"Explicit structured registry PR mapping",
      sourceUrl:"https://github.com/neophilism/Music-Analyzer"
    }));
    current.documents=[{path:"registry/prs.json",url:"https://github.com/neophilism/Music-Analyzer",
      title:"Structured PR registry",importedAt:"2026-10-11T17:38:28.617Z",versions:1}];
    expect(summarizePlannedProgress({planned:16,completed:0,inProgress:14,
      activity:{open:14},sourcePlan:current})).toMatchObject({
      planned:16,completed:16,inProgress:0,notStarted:0,percent:100
    });
    current.items[0].state="in-progress";
    current.originalComplete=15;
    expect(summarizePlannedProgress({planned:16,completed:0,inProgress:14,
      activity:{open:14},sourcePlan:current})).toMatchObject({
      planned:16,completed:15,inProgress:1,notStarted:0,percent:93.8
    });
  });

  it("clamps yellow to unmerged capacity and preserves a zero-safe empty state", () => {
    expect(summarizePlannedProgress({ planned:100,completed:95,inProgress:22 }))
      .toMatchObject({planned:100,completed:95,inProgress:5,notStarted:0});
    expect(summarizePlannedProgress({ planned:0,completed:0 })).toBeNull();
    expect(summarizePlannedProgress({ planned:10,completed:11 })).toBeNull();
    expect(summarizePlannedProgress({planned:0,completed:0,sourcePlan:plan(100,101)})).toBeNull();
  });
});
