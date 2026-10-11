// @vitest-environment node
import type { Pool } from "pg";
import {describe,expect,it,vi} from "vitest";
import {reconcilePlanSources} from "./plan-source-sync.mjs";
const source="registry/roadmap.json";
type Repo={id:string;name:string;full_name:string;default_branch:string};
function database(rows:Repo[]){
 const statements:string[]=[];
 const query=async(sql:string)=>{statements.push(sql);
  if(sql.includes("SELECT DISTINCT r.id"))return {rows,rowCount:rows.length};
  if(sql.includes("FROM github_pull_requests"))return {rows:[],rowCount:0};
  if(sql.includes("SELECT fingerprint FROM project_plan_documents"))return {rows:[],rowCount:0};
  return {rows:[],rowCount:1};
 };
 const client={query,release:vi.fn()};
 return {pool:{query,connect:async()=>client} as unknown as Pool,statements,released:client.release};
}
function roadmap(name:string,n:number){
 return JSON.stringify({repository:"neophilism/"+name,title:name,version:1,planVerified:n>0,plannedPrCount:n,
  milestones:Array.from({length:n},(_,i)=>({id:"X-"+String(i+1).padStart(2,"0"),title:"Reviewed work "+(i+1),pullRequests:[]}))});
}
describe("universal canonical roadmap refresh",()=>{
 it("reads one canonical path per repo, including explicitly unverified projects, without GitHub API calls",async()=>{
  const db=database([
   {id:"a",name:"Live-Competition-Engine",full_name:"neophilism/Live-Competition-Engine",default_branch:"main"},
   {id:"b",name:"FOIA_Bias_Analysis",full_name:"neophilism/FOIA_Bias_Analysis",default_branch:"main"},
  ]);
  const fetcher=vi.fn(async(url:string)=>new Response(
   roadmap(url.includes("FOIA_Bias_Analysis")?"FOIA_Bias_Analysis":"Live-Competition-Engine",
   url.includes("FOIA_Bias_Analysis")?0:3)));
  const out=await reconcilePlanSources(db.pool,{fetcher:fetcher as unknown as typeof fetch});
  expect(out).toMatchObject({registered:2,withDocumentedSource:2,imported:2,failed:0});
  expect(out.completed.map(x=>x.plans[0].path)).toEqual([source,source]);
  expect(db.statements.filter(s=>s.includes("INSERT INTO project_plan_items"))).toHaveLength(3);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls.every(args=>String(args[0]).endsWith("/registry/roadmap.json"))).toBe(true);
  expect(db.released).toHaveBeenCalledTimes(2);
 });
 it("does not re-import legacy paths when a canonical file is missing",async()=>{
  const db=database([
    {id:"a",name:"Missing-App",full_name:"neophilism/Missing-App",default_branch:"main"},
    {id:"b",name:"MMS",full_name:"neophilism/MMS",default_branch:"main"}
  ]);
  const fetcher=vi.fn(async(url:string)=>url.includes("Missing-App")?
    new Response("missing",{status:404}):new Response(roadmap("MMS",2)));
  const out=await reconcilePlanSources(db.pool,{fetcher:fetcher as unknown as typeof fetch,concurrency:2});
  expect(out).toMatchObject({registered:2,imported:1,failed:1});
  expect(out.errors[0]).toMatchObject({repo:"Missing-App",error:"Canonical roadmap missing: registry/roadmap.json"});
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it("uses the 16-unit approved Music Analyzer plan and never maps PR ordinals implicitly",async()=>{
  const db=database([{id:"a",name:"Music-Analyzer",full_name:"neophilism/Music-Analyzer",default_branch:"main"}]);
  const fetcher=vi.fn(async()=>new Response(roadmap("Music-Analyzer",16)));
  const out=await reconcilePlanSources(db.pool,{fetcher:fetcher as unknown as typeof fetch});
  expect(out).toMatchObject({imported:1,failed:0});
  expect(out.completed[0].plans).toEqual([{path:source,units:16}]);
  expect(db.statements.filter(s=>s.includes("INSERT INTO project_plan_items"))).toHaveLength(16);
 });
});
