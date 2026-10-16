import {describe,it,expect} from "vitest";
import {normalizeVelocityRows} from "../server/development-velocity";
import {dayAt,dayOrdinal,velocityBuckets,velocityStats,boardroomImpact,mergedByDay} from "./development-velocity-chart";
import type { VelocityProject } from "./development-velocity";
const sample: VelocityProject[]=[
  {id:"alpha",name:"Alpha",repositories:["org/alpha"],days:[
    {day:"2026-10-02",merges:1},{day:"2026-10-07",merges:2},{day:"2026-10-13",merges:4},{day:"2026-10-16",merges:9}
  ]},
  {id:"beta",name:"Beta",repositories:["org/beta"],days:[
    {day:"2026-10-02",merges:3},{day:"2026-10-13",merges:2}
  ]}
];
describe("development velocity by actual merge time",()=>{
  it("reconstructs zero-merge projects and aggregates multiple repos on the same UTC date",()=>{
    const projects=normalizeVelocityRows([
      {project_id:"x",display_name:"Example",repository_full_name:"org/a",day:"2026-10-13",merged_count:"2"},
      {project_id:"x",display_name:"Example",repository_full_name:"org/b",day:"2026-10-13",merged_count:3},
      {project_id:"y",display_name:"New",repository_full_name:"org/new",day:null,merged_count:0}
    ]);
    expect(projects[0].days).toEqual([{day:"2026-10-13",merges:5}]);
    expect(projects[0].repositories).toEqual(["org/a","org/b"]);
    expect(projects[1].days).toEqual([]);
  });
  it("counts weeks using completed UTC days, excluding a partial today",()=>{
    expect(velocityStats(sample,"portfolio","2026-10-16")).toEqual({
      last7:6,previous7:6,last28:12,changePercent:0
    });
    expect(velocityStats(sample,"alpha","2026-10-16").last7).toBe(4);
    expect(velocityStats(sample,"alpha","2026-10-16").previous7).toBe(3);
    expect(velocityStats(sample,"alpha","2026-10-16").changePercent).toBe(33);
  });
  it("supports daily and 7-day trend buckets without inventing activity",()=>{
    const daily=velocityBuckets(sample,"alpha",14,"rate","2026-10-16");
    expect(daily).toHaveLength(14);
    expect(daily.at(-1)).toMatchObject({from:"2026-10-16",merges:9,partial:true});
    expect(daily.find(row=>row.from==="2026-10-13")?.merges).toBe(4);
    const cumulative=velocityBuckets(sample,"portfolio",14,"cumulative","2026-10-16");
    expect(cumulative.at(-1)?.value).toBe(17);
    const weekly=velocityBuckets(sample,"portfolio",90,"rate","2026-10-16");
    expect(weekly).toHaveLength(13);
    expect(weekly.every(row=>row.merges>=0)).toBe(true);
    expect(weekly.reduce((sum,row)=>sum+row.merges,0)).toBe(21);
  });
  it("only declares a completed Boardroom comparison after seven post-launch days",()=>{
    expect(boardroomImpact(sample,"portfolio",null,"2026-10-16")).toBeNull();
    expect(boardroomImpact(sample,"portfolio","2026-10-12","2026-10-16")).toBeNull();
    const completed=boardroomImpact(sample,"portfolio","2026-10-08","2026-10-16");
    expect(completed).toEqual({before:6,after:6,percent:0,multiplier:1});
    expect(boardroomImpact(sample,"alpha","2026-10-08","2026-10-16")).toEqual({
      before:3,after:4,percent:33,multiplier:1.33
    });
  });
  it("validates date boundaries and never multiplies data from unrelated projects",()=>{
    expect(dayAt(dayOrdinal("2026-10-16"))).toBe("2026-10-16");
    expect(()=>dayOrdinal("2026-02-30")).toThrow();
    expect(mergedByDay(sample,"beta").get("2026-10-16")).toBeUndefined();
  });
});
