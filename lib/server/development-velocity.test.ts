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
