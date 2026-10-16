import {describe,it,expect} from 'vitest';
import {estimateNeonUsage,readNeonBudget} from './neon-budget.mjs';
describe('Neon budget safeguard',()=>{
 it('refuses to infer spending when there is no matching project',()=>{
  expect(estimateNeonUsage({projects:[]})).toBeNull();
 });
 it('converts real consumption units to a conservative pause decision',()=>{
  const p={projects:[{project_id:'damp-hat-24238816',periods:[{consumption:[{timeframe_end:'2026-10-16T21:00:00Z',metrics:[{metric_name:'compute_unit_seconds',value:300000},{metric_name:'root_branch_bytes_month',value:1000000000}]}]}]}]};
  const result=estimateNeonUsage(p);
  expect(result?.paused).toBe(true);
  expect(result?.spentUSD).toBeGreaterThan(8);
  expect(result?.lastObserved).toBe('2026-10-16T21:00:00Z');
 });
 it('fails closed without a configured Neon API credential',async()=>{
  const result=await readNeonBudget({NODE_ENV:'test'});
  expect(result.paused).toBe(true);
  expect(result.spentUSD).toBeNull();
 });
});
