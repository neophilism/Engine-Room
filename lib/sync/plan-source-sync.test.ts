// @vitest-environment node
import type {Pool} from 'pg';
import {describe,expect,it,vi} from 'vitest';
import {reconcilePlanSources} from './plan-source-sync.mjs';
type Repo={id:string;name:string;full_name:string;default_branch:string};
const stamp='2026-10-11T19:00:00.000Z';
const earlier='2026-10-11T18:00:00.000Z';
const pr={id:105,number:1,title:'Approved work',url:'https://github.com/neophilism/Music-Analyzer/pull/1',
  state:'closed',draft:false,createdAt:'2026-10-10T10:00:00.000Z',
  updatedAt:earlier,closedAt:earlier,mergedAt:earlier,headSha:null,baseRef:'main',mergeCommitSha:null};
function registry(name:string,n:number,prs:unknown[]=[]){
  return JSON.stringify({schemaVersion:1,repository:'neophilism/'+name,roadmapVersion:1,
    observedAt:stamp,planVerified:n>0,plannedPrCount:n,
    units:Array.from({length:n},(_,i)=>({id:'T-'+String(i+1).padStart(2,'0'),title:'Approved work '+(i+1),
      origin:'original',prs:i===0&&prs.length?[1]:[]})),pullRequests:prs});
}
function database(rows:Repo[],prior:Array<{number:number;updated_at:Date}>=[],savedPlan=false){
  const statements:string[]=[];
  const query=async(sql:string)=>{
    statements.push(sql);
    if(sql.includes('SELECT DISTINCT r.id'))return {rows,rowCount:rows.length};
    if(sql.includes('SELECT number,updated_at FROM github_pull_requests'))return {rows:prior,rowCount:prior.length};
    if(sql.includes('SELECT 1 FROM project_plan_documents'))return {
      rows:savedPlan?[{exists:1}]:[],rowCount:savedPlan?1:0
    };
    if(sql.includes('SELECT fingerprint FROM project_plan_documents'))return {rows:[],rowCount:0};
    return {rows:[],rowCount:1};
  };
  const client={query,release:vi.fn()};
  return {pool:{query,connect:async()=>client} as unknown as Pool,statements,released:client.release};
}
describe('structured PR importer independent of private GitHub access',()=>{
  it('imports repository-owned JSON directly when accessible',async()=>{
    const db=database([{id:'a',name:'Live-Competition-Engine',full_name:'neophilism/Live-Competition-Engine',default_branch:'main'}]);
    const fetcher=vi.fn(async(_url:string)=>new Response(registry('Live-Competition-Engine',3)));
    const fallback=vi.fn(async()=>{throw Error('No snapshot expected');});
    const out=await reconcilePlanSources(db.pool,{fetcher:fetcher as unknown as typeof fetch,readSnapshot:fallback});
    expect(out).toMatchObject({registered:1,imported:1,failed:0,fromRepository:1,fromSnapshot:0});
    expect(db.statements.filter(x=>x.includes('INSERT INTO project_plan_items'))).toHaveLength(3);
    expect(fetcher.mock.calls.every(x=>String(x[0]).endsWith('/registry/prs.json'))).toBe(true);
    expect(fallback).not.toHaveBeenCalled();
  });
  it('uses the packaged snapshot for private 404s without marking GitHub live',async()=>{
    const db=database([{id:'m',name:'Music-Analyzer',full_name:'neophilism/Music-Analyzer',default_branch:'main'}]);
    const fetcher=vi.fn(async()=>new Response('Not Found',{status:404}));
    const out=await reconcilePlanSources(db.pool,{fetcher:fetcher as unknown as typeof fetch,
      readSnapshot:async()=>registry('Music-Analyzer',16,[pr])});
    expect(out).toMatchObject({imported:1,failed:0,fromSnapshot:1,fromRepository:0,prObservations:1});
    expect(db.statements.filter(x=>x.includes('INSERT INTO project_plan_items'))).toHaveLength(16);
    expect(db.statements.filter(x=>x.includes('INSERT INTO github_pull_requests'))).toHaveLength(1);
    expect(db.statements.some(x=>x.includes('last_success_at'))).toBe(false);
  });
  it('imports existing repository-owned canonical roadmap without requiring prs.json or a snapshot',async()=>{
    const db=database([{id:'s',name:'Superintelligence-Academy',
      full_name:'neophilism/Superintelligence-Academy',default_branch:'main'}]);
    const canonical=JSON.stringify({repository:'neophilism/Superintelligence-Academy',
      version:1,planVerified:true,plannedPrCount:2,milestones:[
        {id:'SIA-001',title:'Application foundation',pullRequests:[1]},
        {id:'SIA-002',title:'Shared SSO',pullRequests:[]}
      ]});
    const fetcher=vi.fn(async(url:string)=>{
      if(url.includes('/registry/roadmap.json'))return new Response(canonical);
      return new Response('',{status:404});
    });
    const fallback=vi.fn(async()=>{throw Error('Bundled snapshot should not be read');});
    const out=await reconcilePlanSources(db.pool,{fetcher:fetcher as unknown as typeof fetch,readSnapshot:fallback});
    expect(out).toMatchObject({registered:1,imported:1,failed:0,fromRepository:1,fromSnapshot:0});
    expect(out.completed[0]).toMatchObject({repo:'Superintelligence-Academy',units:2});
    expect(db.statements.filter(sql=>sql.includes('INSERT INTO project_plan_items'))).toHaveLength(2);
    expect(fetcher.mock.calls.some(call=>String(call[0]).endsWith('/registry/roadmap.json'))).toBe(true);
    expect(fallback).not.toHaveBeenCalled();
  });
  it('never downgrades a previously imported plan when GitHub is inaccessible',async()=>{
    const db=database([{id:'m',name:'Music-Analyzer',
      full_name:'neophilism/Music-Analyzer',default_branch:'main'}],[],true);
    const out=await reconcilePlanSources(db.pool,{
      fetcher:async()=>new Response('',{status:404}),
      readSnapshot:async()=>registry('Music-Analyzer',16,[pr])
    });
    expect(out).toMatchObject({registered:1,imported:0,failed:1});
    expect(out.errors[0].error).toContain('previous plan retained');
    expect(db.statements.some(x=>x.includes('INSERT INTO project_plan_documents'))).toBe(false);
    expect(db.statements.some(x=>x.includes('INSERT INTO project_plan_items'))).toBe(false);
  });
  it('never overwrites a newer webhook observation from a stale snapshot',async()=>{
    const db=database([{id:'m',name:'Music-Analyzer',full_name:'neophilism/Music-Analyzer',default_branch:'main'}],
      [{number:1,updated_at:new Date('2026-10-11T20:00:00.000Z')}]);
    const out=await reconcilePlanSources(db.pool,{fetcher:async()=>new Response('',{status:404}),
      readSnapshot:async()=>registry('Music-Analyzer',1,[pr])});
    expect(out).toMatchObject({imported:1,prObservations:0});
    expect(db.statements.some(x=>x.includes('INSERT INTO github_pull_requests'))).toBe(false);
  });
  it('isolates missing or invalid registries while importing healthy repositories',async()=>{
    const db=database([
      {id:'a',name:'Missing',full_name:'neophilism/Missing',default_branch:'main'},
      {id:'b',name:'MMS',full_name:'neophilism/MMS',default_branch:'main'}
    ]);
    const out=await reconcilePlanSources(db.pool,{fetcher:async()=>new Response('',{status:404}),
      readSnapshot:async name=>name==='MMS'?registry(name,2):Promise.reject(new Error('Unavailable'))});
    expect(out).toMatchObject({registered:2,imported:1,failed:1,fromSnapshot:1});
    expect(out.errors[0]).toMatchObject({repo:'Missing'});
  });
});
