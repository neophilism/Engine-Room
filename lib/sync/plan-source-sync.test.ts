// @vitest-environment node
import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { reconcilePlanSources } from "./plan-source-sync.mjs";

type RepositoryRow = {id:string;name:string;full_name:string;default_branch:string};
function fakeDatabase(rows: RepositoryRow[]) {
  const statements:string[] = [];
  const query = async (sql:string) => {
    statements.push(sql);
    if (sql.includes("SELECT DISTINCT r.id")) return {rows, rowCount:rows.length};
    if (sql.includes("FROM github_pull_requests")) return {rows:[],rowCount:0};
    if (sql.includes("SELECT fingerprint FROM project_plan_documents")) return {rows:[],rowCount:0};
    return {rows:[],rowCount:1};
  };
  const client = { query, release:vi.fn() };
  return {
    pool:{query,connect:async()=>client} as unknown as Pool,
    statements,
    released:client.release
  };
}

describe("independent canonical development plan refresh", () => {
  it("imports full sourced work with zero GitHub API calls or PR-number assumptions", async()=>{
    const db=fakeDatabase([
      {id:"p1",name:"Live-Competition-Engine",full_name:"neophilism/Live-Competition-Engine",default_branch:"main"},
      {id:"p2",name:"FOIA_Bias_Analysis",full_name:"neophilism/FOIA_Bias_Analysis",default_branch:"main"},
    ]);
    const fetcher=vi.fn(async(url:string)=>{
      expect(url).toMatch(/^https:\/\/raw\.githubusercontent\.com\/neophilism\/Live-Competition-Engine\/main\//);
      return new Response("# Full plan\n#### LC-01 — Accounts\n#### LC-02 — Events\n#### LC-03 — Judges\n");
    });
    const outcome=await reconcilePlanSources(db.pool,{fetcher:fetcher as unknown as typeof fetch});
    expect(outcome).toMatchObject({registered:2,withDocumentedSource:1,imported:1,failed:0});
    expect(outcome.completed[0].plans).toEqual([{path:"docs/DEVELOPMENT_PLAN.md",units:3}]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(db.statements.filter(q=>q.includes("INSERT INTO project_plan_items"))).toHaveLength(3);
    expect(db.statements.every(q=>!q.includes("api.github.com"))).toBe(true);
    expect(db.released).toHaveBeenCalledOnce();
  });

  it("continues importing healthy sources when another repository has a missing plan", async()=>{
    const db=fakeDatabase([
      {id:"p1",name:"NFT-Minting-Console",full_name:"neophilism/NFT-Minting-Console",default_branch:"main"},
      {id:"p2",name:"MMS",full_name:"neophilism/MMS",default_branch:"main"}
    ]);
    const fetcher=vi.fn(async(url:string)=>{
      if(url.includes("NFT-Minting-Console"))return new Response("not found",{status:404});
      return new Response("# MMS\n### MMS-01 — Foundation\n### MMS-02 — Casting\n### MMS-03 — Production\n");
    });
    const outcome=await reconcilePlanSources(db.pool,{fetcher:fetcher as unknown as typeof fetch,concurrency:2});
    expect(outcome).toMatchObject({registered:2,withDocumentedSource:2,imported:1,failed:1});
    expect(outcome.errors[0]).toMatchObject({repo:"NFT-Minting-Console",error:"Configured plan missing: docs/DEVELOPMENT_PLAN.md"});
    expect(outcome.completed[0].plans[0]).toEqual({path:"docs/DEVELOPMENT_PLAN.md",units:3});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
