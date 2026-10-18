import {describe,it,expect} from 'vitest';
import {normalizePrSummary} from './pr-summary';
describe('GitHub PR facts',()=>{
 it('preserves GitHub open and closed counters including closed without merge',()=>{
  expect(normalizePrSummary({total:'120',open:'4',closed:'116',merged:'111',closedWithoutMerge:'5',drafts:'1'}))
   .toMatchObject({total:120,open:4,closed:116,merged:111,closedWithoutMerge:5,drafts:1});
 });
 it('accepts zero PRs and rejects inconsistent counters',()=>{
  const empty={total:0,open:0,closed:0,merged:0,closedWithoutMerge:0,drafts:0};
  expect(normalizePrSummary(empty).total).toBe(0);
  for(const bad of [{...empty,closed:1},{...empty,drafts:1},{...empty,merged:-1},{...empty,total:NaN}]) expect(()=>normalizePrSummary(bad)).toThrow();
 });
});
