import { describe, expect, it } from "vitest";
import { summarizePlannedProgress } from "./planned-progress";
import type { SourcePlanSummary } from "./live-monitor";

function plan(original: number, originalComplete: number, added = 0, addedComplete = 0): SourcePlanSummary {
  return { original, originalComplete, added, addedComplete, unmapped: original - originalComplete + added - addedComplete, items: [], documents: [] };
}

describe("development plan completion, never PR-activity completion", () => {
  it("renders 9/100 as 9%, even when the other 90 items have no PR yet", () => {
    expect(summarizePlannedProgress({ planned: 100, completed: 9, sourcePlan: plan(100, 9) }))
      .toMatchObject({ planned: 100, completed: 9, remaining: 91, percent: 9 });
  });
  it("does not subtract unmapped tasks or a pending PR from the denominator", () => {
    expect(summarizePlannedProgress({ planned: 0, completed: 0, sourcePlan: plan(100, 9) }))
      .toMatchObject({ planned: 100, completed: 9, remaining: 91, percent: 9 });
  });
  it("preserves a green completed baseline while counting planned additions in amber", () => {
    expect(summarizePlannedProgress({ planned: 40, completed: 40, sourcePlan: plan(40, 40, 60, 9) }))
      .toEqual({
        original: { planned: 40, completed: 40 },
        added: { planned: 60, completed: 9 },
        planned: 100, completed: 49, remaining: 51, percent: 49
      });
  });
  it("includes explicitly planned additions even when their document contains no original units", () => {
    const additionsOnly = plan(0, 0, 60, 9);
    expect(summarizePlannedProgress({ planned: 40, completed: 40, sourcePlan: additionsOnly }))
      .toMatchObject({ planned: 100, completed: 49, remaining: 51, percent: 49 });
  });
  it("does not call raw, unmapped repository PRs additional planned work", () => {
    expect(summarizePlannedProgress({ planned: 40, completed: 40 }))
      .toMatchObject({ planned: 40, completed: 40, percent: 100, added: { planned: 0, completed: 0 } });
  });
  it("does not combine source documents with an incompatible original plan", () => {
    expect(summarizePlannedProgress({ planned: 40, completed: 9, sourcePlan: plan(100, 9, 10, 1) }))
      .toMatchObject({ planned: 40, completed: 9, added: { planned: 0, completed: 0 } });
  });
  it("never displays inconsistent or zero denominators as completed", () => {
    expect(summarizePlannedProgress({ planned: 0, completed: 0 })).toBeNull();
    expect(summarizePlannedProgress({ planned: 10, completed: 11 })).toBeNull();
    expect(summarizePlannedProgress({ planned: 0, completed: 0, sourcePlan: plan(100, 101) })).toBeNull();
  });
});
