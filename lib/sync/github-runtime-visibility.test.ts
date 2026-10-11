// @vitest-environment node
import {describe,it,expect,vi} from "vitest";
import type {PoolClient} from "pg";
import {ensureRepository} from "./github-runtime.mjs";

describe("GitHub repository metadata reconciliation",()=>{
  it("updates repository visibility on every authenticated discovery, including public-to-private changes",async()=>{
    const queries:Array<{sql:string;params:unknown[]}>=[];
    const db={query:vi.fn(async(sql:string,params:unknown[]=[] )=>{
      queries.push({sql,params});
      if(sql.startsWith("INSERT INTO repositories"))return {rows:[{id:"repo-1"}],rowCount:1};
      if(sql.startsWith("SELECT project_id FROM project_repositories"))return {rows:[{project_id:"project-1"}],rowCount:1};
      return {rows:[],rowCount:1};
    })};
    const repo={id:120,owner:{login:"neophilism"},name:"Music-Analyzer",
      full_name:"neophilism/Music-Analyzer",html_url:"https://github.com/neophilism/Music-Analyzer",
      private:true,archived:false,default_branch:"main",fork:false};
    const out=await ensureRepository(db as unknown as Pick<PoolClient,"query">,repo,{...process.env,ENGINE_ROOM_GITHUB_OWNER:"neophilism",GITHUB_READ_TOKEN:"test-only"});
    expect(out).toBe("repo-1");
    const insert=queries.find(q=>q.sql.startsWith("INSERT INTO repositories"));
    expect(insert?.sql).toContain("visibility=excluded.visibility");
    expect(insert?.params[6]).toBe("private");
    expect(queries.some(q=>q.sql.includes("INSERT INTO github_repository_sync"))).toBe(true);
  });
});
