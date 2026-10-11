// @vitest-environment node
import {describe,it,expect} from "vitest";
import {parseCanonicalRoadmap,candidateRoadmapPaths,shouldImportPlanDocument,CANONICAL_ROADMAP_PATH} from "./canonical-roadmap.mjs";
import {parsePlanItems} from "./plan-import.mjs";

const example={title:"Public Debate Engine",version:2,plannedPrCount:3,milestones:[
  {id:"PDE-01",title:"Foundation",pullRequests:["https://github.com/neophilism/Debate-Engine/pull/1"]},
  {id:"PDE-02",title:"Unbuilt writing mode",pullRequests:[]},
  {id:"PDE-03",title:"Candidate consent",origin:"addition",pullRequests:[7],openPullRequests:[9]}
]};
describe("canonical repository roadmap ingestion",()=>{
 it("imports the repository's existing registry roadmap shape with exact mapped PR evidence",()=>{
  const items=parsePlanItems(JSON.stringify(example),CANONICAL_ROADMAP_PATH,"Debate-Engine",[]);
  expect(items).toHaveLength(3);
  expect(items.map(x=>x.numbers)).toEqual([[1],[],[7,9]]);
  expect(items.map(x=>x.scope)).toEqual(["original","original","addition"]);
  expect(items[1]).toMatchObject({ordinal:2,sourceItemId:"PDE-02",numbers:[]});
 });
 it("preserves a truly unverified plan as zero explicit units without inventing a denominator",()=>{
  expect(parseCanonicalRoadmap(JSON.stringify({repository:"neophilism/Debate-Engine",version:1,planVerified:false,plannedPrCount:0,milestones:[]}),"Debate-Engine")).toEqual([]);
  expect(()=>parseCanonicalRoadmap(JSON.stringify({version:1,planVerified:true,plannedPrCount:0,milestones:[]}),"Debate-Engine")).toThrow();
 });
 it("rejects a root total that disagrees with its explicit item list",()=>{
  expect(()=>parseCanonicalRoadmap(JSON.stringify({...example,plannedPrCount:4}),"Debate-Engine")).toThrow(/plannedPrCount/);
 });
 it("rejects wrong-repository GitHub URLs, duplicates, and unverifiable PR strings",()=>{
  const changed=(milestones: unknown[])=>JSON.stringify({...example,milestones});
  const first=example.milestones[0];
  expect(()=>parseCanonicalRoadmap(changed([{...first,pullRequests:["https://github.com/neophilism/Live-Debate-Engine/pull/1"]}]),"Debate-Engine")).toThrow();
  expect(()=>parseCanonicalRoadmap(changed([first,first]),"Debate-Engine")).toThrow();
  expect(()=>parseCanonicalRoadmap(changed([{...first,pr:"#1"}]),"Debate-Engine")).toThrow();
 });
 it("can intentionally accept historical PR redirects only after an explicit name alias",()=>{
  const renamed={...example,repository:"neophilism/Public-Debate-Engine",previousRepositoryNames:["Debate-Engine"]};
  const items=parseCanonicalRoadmap(JSON.stringify(renamed),"Public-Debate-Engine");
  expect(items[0].numbers).toEqual([1]);
  expect(()=>parseCanonicalRoadmap(JSON.stringify({...renamed,previousRepositoryNames:[]}),"Public-Debate-Engine")).toThrow();
 });
 it("prefers the standard path for every repository and falls back to existing sources",()=>{
  expect(candidateRoadmapPaths("Debate-Engine",{} )[0]).toBe(CANONICAL_ROADMAP_PATH);
  expect(candidateRoadmapPaths("Custom",{"Custom":["docs/DEVELOPMENT_PLAN.md"]})).toEqual([CANONICAL_ROADMAP_PATH,"docs/DEVELOPMENT_PLAN.md"]);
  const documents=[
    {repository_id:"debate",repository_name:"Debate-Engine",path:CANONICAL_ROADMAP_PATH},
    {repository_id:"debate",repository_name:"Debate-Engine",path:"docs/DEVELOPMENT_PLAN.md"},
    {repository_id:"other",repository_name:"Other",path:"docs/roadmap.md"}
  ];
  expect(documents.filter(doc=>shouldImportPlanDocument(doc,new Set(["debate"]),{"Other":["docs/roadmap.md"]})).map(x=>x.path))
    .toEqual([CANONICAL_ROADMAP_PATH,"docs/roadmap.md"]);
 });
 it("keeps an unmapped future unit in denominator rather than inventing its PR",()=>{
  const parsed=parseCanonicalRoadmap(JSON.stringify(example),"Debate-Engine");
  expect(parsed).toHaveLength(3);
  expect(parsed[1].numbers).toEqual([]);
 });
 it("records an explicitly unverified repository as unscored rather than inventing PR work",()=>{
  const marker={version:1,planVerified:false,plannedPrCount:0,milestones:[]};
  expect(parseCanonicalRoadmap(JSON.stringify(marker),"The-Cornerstone")).toEqual([]);
  expect(()=>parseCanonicalRoadmap(JSON.stringify({...marker,plannedPrCount:10}),"The-Cornerstone")).toThrow();
 });
 it("rejects missing version or unsupported row ID",()=>{
  expect(()=>parseCanonicalRoadmap(JSON.stringify({...example,version:0}),"Debate-Engine")).toThrow();
  expect(()=>parseCanonicalRoadmap(JSON.stringify({...example,milestones:[{id:"1",title:"Bad"}]}),"Debate-Engine")).toThrow();
 });
});
