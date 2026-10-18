import {describe,it,expect} from 'vitest';
import {portfolioInventory} from './portfolio-inventory';
import type {PortfolioProjectOverview} from './portfolio-overview';
const project=(id:string,status:PortfolioProjectOverview['status']='planned'):PortfolioProjectOverview=>({id,displayName:id,status,planned:0,completed:0,inProgress:0,percent:0,repositories:[]});
describe('auditable inventory',()=>{
 it('counts projects once regardless of repository count and retains archived history',()=>{
  const p=project('multi','active-development');p.repositories=[{id:'one',fullName:'o/one',htmlUrl:'',planned:0,completed:0,inProgress:0,percent:0},{id:'two',fullName:'o/two',htmlUrl:'',planned:0,completed:0,inProgress:0,percent:0}];
  const result=portfolioInventory([p,project('empty'),project('old','archived'),project('paused','paused')]);
  expect(result).toMatchObject({registered:4,active:1,planned:1,archived:1,paused:1,recent:0});
  expect(result.rows).toHaveLength(result.registered);
 });
 it('distinguishes historical activity from recent work and refuses duplicate identities',()=>{
  const p={...project('old'),activity:{total:1,merged:1,open:0,drafts:0,failedChecks:0,runningChecks:0,lastObservedAt:'2026-01-01T00:00:00Z'}};
  expect(portfolioInventory([p],new Date('2026-10-18T21:00:00Z'))).toMatchObject({registered:1,active:1,recent:0});
  expect(()=>portfolioInventory([p,p])).toThrow('duplicate');
 });
});
