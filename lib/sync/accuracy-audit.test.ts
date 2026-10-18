// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import type {PoolClient} from 'pg';
import {fetchCompletePrFacts,summarizeGitHubPulls,auditPortfolioAccuracy} from './accuracy-audit.mjs';
const records=Array.from({length:120},(_,i)=>({id:i+1,number:i+1,state:i<4?'open':'closed',draft:i===0,merged_at:i<9?null:'2026-10-18T18:00:00Z'}));
describe('on-demand complete GitHub accuracy audit',()=>{
 it('reproduces the exact incident counters across pagination',async()=>{
  const get=vi.fn(async(path:string)=>path.endsWith('page=1')?records.slice(0,100):records.slice(100));
  expect(await fetchCompletePrFacts(get,'owner/repo')).toEqual({total:120,open:4,closed:116,merged:111,closedWithoutMerge:5,drafts:1});
  expect(get).toHaveBeenCalledTimes(2);
 });
 it('handles zero PRs and rejects duplicate/unstable pages or invalid records',()=>{
  expect(summarizeGitHubPulls([]).total).toBe(0);
  expect(()=>summarizeGitHubPulls([records[0],records[0]])).toThrow();
  expect(()=>summarizeGitHubPulls([{...records[0],merged_at:'2026-10-18T00:00:00Z'}])).toThrow();
 });
 it('audits every registered row beyond 100 and reports provider failures as unknown',async()=>{
  const rows=Array.from({length:152},(_,i)=>({id:String(i),full_name:'o/r'+i,total:0,open:0,closed:0,merged:0,closedWithoutMerge:0,drafts:0,database_observed_at:'2026-10-18T21:00:00Z',last_success_at:null}));
  const db={query:vi.fn(async()=>({rows}))};
  const report=await auditPortfolioAccuracy(db as unknown as Pick<PoolClient,'query'>,{owner:'o',get:async path=>{if(path.includes('/r151/'))throw new Error('403');return [];}});
  expect(report).toMatchObject({tracked:152,matched:151,different:0,unknown:1});
  expect(db.query).toHaveBeenCalledTimes(1);
  expect(report.repositories.some((r:unknown)=>(r as {live:unknown}).live===null)).toBe(true);
 });
});
