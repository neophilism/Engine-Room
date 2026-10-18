import {describe,it,expect} from 'vitest';
import {coverageStatus,reconciliationKey} from './observation.mjs';
describe('complete observation publication',()=>{
 it('never calls deferred leased or rate-limited work a complete refresh',()=>{
  expect(coverageStatus({requested:152,repositories:152,failed:0,deferred:0})).toBe('succeeded');
  for(const x of [{deferred:1},{failed:1},{rateLimited:true},{discoveryIncomplete:true},{repositories:100}])
   expect(coverageStatus({requested:152,repositories:152,failed:0,deferred:0,...x})).toBe('partial');
 });
 it('has stable owner identity without depending on a credential',()=>{
  expect(reconciliationKey({ENGINE_ROOM_GITHUB_OWNER:'Owner'})).toBe(reconciliationKey({ENGINE_ROOM_GITHUB_OWNER:'owner'}));
  expect(reconciliationKey({GITHUB_INSTALLATION_ID:'12'})).toBe(12);
 });
});
