// @vitest-environment node
import {describe,it,expect} from "vitest";
import planSources from "../config/portfolio-plan-sources.json";
import {parsePlanItems,parseApprovedManifestItems} from "./plan-import.mjs";

function manifest(repo:string, n:number) {
  return [
    "project:","  repository: neophilism/"+repo,
    "roadmap:","  version: 1","  planned_prs: "+n,"  approved: true",
    "milestones:","  - name: Foundation","    prs: "+(n-10),
    "  - name: Production readiness","    prs: 10",""
  ].join("\n");
}
describe("new 2026 project discovery and truthful denominators",()=>{
  it("registers The Public Record without assuming fifty-two merged PRs",()=>{
    const body=manifest("The-Public-Record",52);
    const map=JSON.stringify({sourceRepository:"neophilism/The-Public-Record",roadmapVersion:1,
      pullRequestNumbers:[1,2,3,null,...Array(48).fill(null)]});
    const entries=parseApprovedManifestItems(body,"The-Public-Record",map);
    expect(entries).toHaveLength(52);
    expect(entries.filter(x=>x.numbers.length>0).map(x=>x.numbers[0])).toEqual([1,2,3]);
    expect(planSources["The-Public-Record"]).toEqual([".exechub/project.yml"]);
  });
  it("registers the separately approved 50-unit Justice For All core",()=>{
    const entries=parseApprovedManifestItems(manifest("Justic-For-All",50),"Justic-For-All");
    expect(entries).toHaveLength(50);
    expect(entries.every(e=>e.numbers.length===0)).toBe(true);
    expect(planSources["Justic-For-All"]).toEqual([".exechub/project.yml"]);
  });
  it("reads bold PR-01 headings without mapping arbitrary repository PR number 1",()=>{
    const text=[
      "# Generic NFT Console", "## PR roadmap",
      "**PR-01 — Architecture baseline.** Notes and acceptance.",
      "**PR-02 — Tests and audit.** Notes.",
      "**PR-03 — Generic deployment.** Notes."
    ].join("\n");
    const items=parsePlanItems(text,"docs/DEVELOPMENT_PLAN.md","NFT-Minting-Console",
      [{number:1,title:"Unrelated issue"},{number:41,title:"PR-02: Tests and audit"}]);
    expect(items.map(i=>i.ordinal)).toEqual([1,2,3]);
    expect(items.map(i=>i.numbers)).toEqual([[],[41],[]]);
    expect(planSources["NFT-Minting-Console"]).toEqual(["docs/DEVELOPMENT_PLAN.md"]);
  });
  it("reads Music Analyzer's spaced PR heading format",()=>{
    const body=["# Music Analyzer","## PR roadmap",
      "### PR 01 Validate models and record architecture",
      "### PR 02 Create native application foundation",
      "### PR 03 Import tracks and save projects"].join("\n");
    const items=parsePlanItems(body,"docs/DEVELOPMENT_PLAN.md","Music-Analyzer");
    expect(items).toHaveLength(3);
    expect(items[0].sourceItemId).toBe("PR-01");
    expect(items.map(i=>i.numbers)).toEqual([[],[],[]]);
    expect(planSources["Music-Analyzer"]).toEqual(["docs/DEVELOPMENT_PLAN.md"]);
  });
  it("rejects duplicate work-unit ordinals instead of double counting",()=>{
    const body=["# Plan","**PR-01 — First.**","**PR-01 — Duplicate.**","**PR-02 — Third.**"].join("\n");
    expect(parsePlanItems(body,"docs/DEVELOPMENT_PLAN.md","NFT-Minting-Console")).toEqual([]);
  });
});
