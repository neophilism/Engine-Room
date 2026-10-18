// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import type {PoolClient} from 'pg';
import {persistPlanDocument} from './plan-import.mjs';
import {parseStructuredPrRegistry} from './structured-pr-registry.mjs';
describe('dependency provenance roundtrip',()=>{
 it('persists every parsed stable ID, dependency and external prerequisite beside its exact source',async()=>{
  const body=JSON.stringify({schemaVersion:1,repository:'neophilism/Example',roadmapVersion:1,planVerified:true,plannedPrCount:2,
   observedAt:'2026-10-18T21:00:00Z',pullRequests:[],units:[{id:'EX-01',title:'Base',prs:[],origin:'original'},
    {id:'EX-02',title:'Consumer',origin:'addition',prs:[],dependsOn:['EX-01'],externalDependencies:[{repository:'neophilism/Upstream',unitId:'UP-42'}],externalPrerequisites:['Verified deployment'],acceptance:'Prove the complete flow'}]});
  const parsed=parseStructuredPrRegistry(body,'Example');
  const db={query:vi.fn(async()=>({rows:[],rowCount:1}))};
  await persistPlanDocument(db as unknown as Pick<PoolClient,'query'>,{id:'repo',full_name:'neophilism/Example'},
   {path:'registry/prs.json',body,ref:'a'.repeat(40),items:parsed.items});
  const calls=db.query.mock.calls as unknown as [string,unknown[]][];
  const writes=calls.filter(([sql])=>sql.startsWith('INSERT INTO project_plan_items'));
  expect(writes[1][1].slice(10,14)).toEqual(['EX-02',JSON.stringify(['EX-01']),JSON.stringify([{repository:'neophilism/Upstream',unitId:'UP-42'}]),JSON.stringify(['Verified deployment'])]);
  expect(JSON.parse(String(writes[1][1][14])).acceptance).toBe('Prove the complete flow');
  expect(calls.find(([sql])=>sql.startsWith('INSERT INTO project_plan_documents'))?.[1][7]).toBe('a'.repeat(40));
 });
});
