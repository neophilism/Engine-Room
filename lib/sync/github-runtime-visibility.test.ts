// @vitest-environment node
import {describe,it,expect,vi} from "vitest";
import type {PoolClient} from "pg";
import {ensureRepository} from "./github-runtime.mjs";

describe("GitHub repository metadata reconciliation",()=>{
  it("refreshes an existing project's About text and propagates an intentional deletion",async()=>{
    const queries:Array<{sql:string;params:unknown[]}>=[];
    const db={query:vi.fn(async(sql:string,params:unknown[]=[])=>{
      queries.push({sql,params});
      if(sql.startsWith('INSERT INTO repositories'))return {rows:[{id:'repo-1'}],rowCount:1};
      if(sql.startsWith('SELECT project_id'))return {rows:[{project_id:'project-1'}],rowCount:1};
      return {rows:[],rowCount:1};
    })};
    const repo={id:1,owner:{login:'neophilism'},name:'Engine-Room',full_name:'neophilism/Engine-Room',html_url:'https://github.com/neophilism/Engine-Room',description:'Current About',created_at:'2026-10-07T19:05:35Z'};
    await ensureRepository(db as unknown as Pick<PoolClient,'query'>,repo,process.env);
    expect(queries.find(q=>q.sql.startsWith('UPDATE projects'))?.params).toEqual(['repo-1','Current About']);
    queries.length=0;
    await ensureRepository(db as unknown as Pick<PoolClient,'query'>,{...repo,description:null},process.env);
    expect(queries.find(q=>q.sql.startsWith('UPDATE projects'))?.params).toEqual(['repo-1',null]);
  });
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


describe('discovery project identity collision',()=>{
 it('uses an immutable repository suffix when a normalized slug already owns another repository',async()=>{
  const candidates:string[]=[];
  const db={query:vi.fn(async(sql:string,params:unknown[]=[])=>{
   if(sql.startsWith('INSERT INTO repositories'))return {rows:[{id:'new-repo'}],rowCount:1};
   if(sql.startsWith('SELECT project_id'))return {rows:[],rowCount:0};
   if(sql.startsWith('INSERT INTO projects')){candidates.push(String(params[0]));return {rows:[{id:params[0]}],rowCount:1};}
   if(sql.startsWith('INSERT INTO project_repositories'))return {rows:params[0]==='foo-bar'?[]:[{project_id:params[0]}],rowCount:params[0]==='foo-bar'?0:1};
   return {rows:[],rowCount:1};
  })};
  await ensureRepository(db,{id:987,owner:{login:'neophilism'},name:'foo_bar',full_name:'neophilism/foo_bar',html_url:'https://github.com/neophilism/foo_bar'},{ENGINE_ROOM_GITHUB_OWNER:'neophilism'});
  expect(candidates).toEqual(['foo-bar','foo-bar-987']);
 });
});
