import { describe, expect, it } from "vitest";
import { normalizeVelocityRows } from "./development-velocity";
import { InvalidVelocityMarker, parseVelocityMarkerDate } from "./development-velocity-markers";

describe("velocity source normalization", () => {
  it("keeps zero-PR projects visible and sums merges by day", () => {
    const rows = normalizeVelocityRows([
      {project_id:"a",display_name:"Alpha",repository_full_name:"org/alpha",day:null,merged_count:"0"},
      {project_id:"b",display_name:"Beta",repository_full_name:"org/beta",day:"2026-10-13",merged_count:1},
      {project_id:"b",display_name:"Beta",repository_full_name:"org/beta-second",day:"2026-10-13",merged_count:"2"}
    ]);
    expect(rows[0].name).toBe("Alpha");
    expect(rows[0].days).toEqual([]);
    expect(rows[1].days).toEqual([{day:"2026-10-13",merges:3}]);
    expect(rows[1].repositories).toHaveLength(2);
  });
  it("counts current-wave merged PRs once per repository and clamps legacy project starts",()=>{
    // SQL has already removed pre-2026-10-05 mergers from legacy repos and
    // clamped their effective rate start to the first current-wave launch.
    const rows=normalizeVelocityRows([
      {project_id:"p",display_name:"Project",repository_full_name:"org/legacy",
        repository_started_on:"2026-10-05",start_source:"launch-window",
        lifetime_merged_count:6,day:"2026-10-10",merged_count:4},
      {project_id:"p",display_name:"Project",repository_full_name:"org/legacy",
        repository_started_on:"2026-10-05",start_source:"launch-window",
        lifetime_merged_count:6,day:"2026-10-11",merged_count:2},
      {project_id:"p",display_name:"Project",repository_full_name:"org/new",
        repository_started_on:"2026-10-08",start_source:"github",
        lifetime_merged_count:"5",day:"2026-10-11",merged_count:3},
      {project_id:"empty",display_name:"Empty",repository_full_name:"org/empty",
        repository_started_on:"2026-10-16",start_source:"github",
        lifetime_merged_count:0,day:null,merged_count:0}
    ]);
    expect(rows[0].lifetime).toEqual({
      startedOn:"2026-10-16",mergedPrs:0,startSource:"github",undatedRepositories:0
    });
    expect(rows[1].lifetime).toEqual({
      startedOn:"2026-10-05",mergedPrs:11,startSource:"launch-window",undatedRepositories:0
    });
    expect(rows[1].repositories).toEqual(["org/legacy","org/new"]);
    expect(rows[1].days).toEqual([
      {day:"2026-10-10",merges:4},{day:"2026-10-11",merges:5}
    ]);
  });
  it("does not invent an inception date if the repository has no usable start",()=>{
    const projects=normalizeVelocityRows([{project_id:"no-date",display_name:"Unknown",repository_full_name:"org/no-date",
      lifetime_merged_count:2,day:null,merged_count:0}]);
    expect(projects[0].lifetime).toEqual({
      startedOn:null,mergedPrs:2,startSource:"unavailable",undatedRepositories:1
    });
  });
  it("rejects invalid persisted counts",()=>{
    expect(()=>normalizeVelocityRows([
      {project_id:"a",display_name:"Alpha",repository_full_name:"org/a",day:"2026-10-12",merged_count:-1}
    ])).toThrow();
  });
});

describe("Boardroom comparison milestone validation",()=>{
  const today=new Date("2026-10-16T16:00:00Z");
  it("supports an explicit actual date or audited clearing",()=>{
    expect(parseVelocityMarkerDate("2026-10-12",today)).toBe("2026-10-12");
    expect(parseVelocityMarkerDate(null,today)).toBeNull();
  });
  it("rejects future, impossible and malformed dates",()=>{
    for(const value of ["2026-10-17","2026-02-30","October 16","",0,{},true]){
      expect(()=>parseVelocityMarkerDate(value,today)).toThrow(InvalidVelocityMarker);
    }
  });
});
