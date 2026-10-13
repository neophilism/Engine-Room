import { describe,expect,it } from "vitest";
import { aggregateTimeCompletion,estimateTimeCompletion, type TimeEvidence } from "./time-completion";

const day=86400000;
const base=Date.parse("2026-10-01T00:00:00.000Z");
const at=(d:number)=>new Date(base+day*d).toISOString();
const accepted=(dayNumber:number,cycle=0.5)=>({openedAt:at(dayNumber-cycle),completedAt:at(dayNumber)});
function sample(dates:number[],duration=0.5):TimeEvidence {
  return {startedAt:at(0),startBasis:"repository-created",
    syncedAt:at(10),accepted:dates.map(d=>accepted(d,duration))};
}
describe("elapsed-time estimation — distinct from completed-work progress",()=>{
  it("adjusts calendar ETA for recent acceleration without changing the approved work denominator",()=>{
    const result=estimateTimeCompletion({planned:10,completed:5},sample([6,7,8,9,10]),at(11));
    expect(result.state).toBe("forecast");
    expect(result.timePercent).toBeGreaterThan(50);
    expect(result.calendarRemainingDays).toBeGreaterThan(0);
    expect(result.calendarFinishAt).toBeTruthy();
    expect(result.confidence).toBe("developing");
    expect(result.sampleSize).toBe(5);
    expect(result.elapsedDays).toBe(11);
  });
  it("expanding the approved plan lowers time completion and increases remaining duration",()=>{
    const evidence=sample([6,7,8,9,10]);
    const small=estimateTimeCompletion({planned:10,completed:5},evidence,at(11));
    const expanded=estimateTimeCompletion({planned:20,completed:5},evidence,at(11));
    expect(expanded.timePercent!).toBeLessThan(small.timePercent!);
    expect(expanded.calendarRemainingDays!).toBeGreaterThan(small.calendarRemainingDays!);
  });
  it("reduces calendar pace when no new merges occur, including ongoing blockers",()=>{
    const evidence=sample([6,7,8,9,10]);
    const early=estimateTimeCompletion({planned:10,completed:5},evidence,at(11));
    const late=estimateTimeCompletion({planned:10,completed:5},evidence,at(25));
    expect(late.calendarRemainingDays!).toBeGreaterThan(early.calendarRemainingDays!);
  });
  it("tracks separate PR-cycle pace and observed overlapping PR capacity",()=>{
    const sequential=sample([5,6,7,8,9],0.4);
    const overlap:TimeEvidence={...sequential,
      accepted:[5,6,7,8,9].map(d=>({openedAt:at(3),completedAt:at(d)}))};
    const one=estimateTimeCompletion({planned:10,completed:5},sequential,at(11));
    const many=estimateTimeCompletion({planned:10,completed:5},overlap,at(11));
    expect(one.parallelPrSlots).toBe(1);
    expect(many.parallelPrSlots).toBeGreaterThan(1);
    expect(one.prCycleRemainingDays).not.toBeNull();
    expect(many.prCycleRemainingDays).not.toBeNull();
  });
  it("shows unknown, not fabricated deadlines, without accepted units or verified timestamps",()=>{
    expect(estimateTimeCompletion({planned:10,completed:0},sample([]),at(11)).state).toBe("unavailable");
    expect(estimateTimeCompletion({planned:10,completed:5},sample([]),at(11)).calendarFinishAt).toBeNull();
    expect(estimateTimeCompletion({planned:10,completed:5},
      {...sample([5]),startedAt:null},at(11)).timePercent).toBeNull();
    expect(estimateTimeCompletion({planned:10,completed:5},
      {...sample([5]),startedAt:at(15)},at(11)).state).toBe("unavailable");
    expect(estimateTimeCompletion({planned:0,completed:0},null,at(11)).state).toBe("unavailable");
  });
  it("avoids negative or unbounded projections and ignores impossible source timestamps",()=>{
    const result=estimateTimeCompletion({planned:10,completed:5},
      {...sample([5]),accepted:[accepted(20)]},at(11));
    expect(result.state).toBe("unavailable");
    expect(result.sampleSize).toBe(0);
    expect(estimateTimeCompletion({planned:10,completed:11},sample([5]),at(11)).timePercent).toBeNull();
  });
  it("marks completed projects at 100% even when no active ETA remains",()=>{
    const result=estimateTimeCompletion({planned:10,completed:10},sample([]),at(11));
    expect(result).toMatchObject({state:"complete",timePercent:100,
      calendarRemainingDays:0,prCycleRemainingDays:0});
  });
  it("portfolio total projects finish at the latest project date, never the sum",()=>{
    const one=estimateTimeCompletion({planned:10,completed:5},sample([2,3,4,5,6]),at(11));
    const two=estimateTimeCompletion({planned:20,completed:5},sample([2,3,4,5,6]),at(11));
    const total=aggregateTimeCompletion([one,two],at(11))!;
    expect(total.calendarFinishAt).toBe(two.calendarFinishAt);
    expect(total.calendarRemainingDays).toBe(two.calendarRemainingDays);
    expect(total.timePercent).not.toBeNull();
    expect(aggregateTimeCompletion([one,null],at(11))!.state).toBe("unavailable");
  });
});
