import {describe,it,expect} from 'vitest';
import {sourceImplementationReview} from './implementation-review';
const review={implementation:'implemented',reviewedAt:'2026-10-19T00:00:00Z',softwareGap:null,activationRequirement:'Supply final video.',sourceFiles:[{path:'apps/web/page.mjs',sha256:'a'.repeat(64)}]};
describe('source implementation evidence',()=>{
 it('preserves implemented software independently of missing PR mappings and release inputs',()=>{
  expect(sourceImplementationReview({prs:[],status:'implemented',implementationReview:review})).toEqual(review);
 });
 it('does not invent software findings from contribution PRs or a status label alone',()=>{
  for(const x of [{status:'implemented'},{contributingPrs:[8]},{implementationReview:{...review,sourceFiles:[]}},{implementationReview:{...review,softwareGap:'Missing feature'}},{implementationReview:{...review,implementation:'remaining_implementation'}}])expect(sourceImplementationReview(x)).toBeUndefined();
  expect(sourceImplementationReview({implementationReview:{...review,implementation:'remaining_implementation',softwareGap:'Add recipient recovery.'}})?.softwareGap).toBe('Add recipient recovery.');
 });
});
