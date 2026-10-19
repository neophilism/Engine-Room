import {describe,it,expect} from 'vitest';
import {workerHeartbeatFresh,WORKER_HEARTBEAT_INTERVAL_MS,WORKER_STALE_AFTER_MS} from './worker-freshness.mjs';
describe('worker availability is independent of GitHub polling cadence',()=>{
 const now=Date.parse('2026-10-19T00:00:00Z');
 it('allows one delayed pulse without reporting a healthy worker disconnected',()=>{
  expect(WORKER_HEARTBEAT_INTERVAL_MS*2).toBeLessThan(WORKER_STALE_AFTER_MS);
  for(const age of [0,30000,60000,89999])expect(workerHeartbeatFresh(new Date(now-age),now)).toBe(true);
 });
 it('reports a stopped worker and invalid/future observations honestly',()=>{
  for(const value of [null,undefined,'bad',new Date(now-90000),new Date(now-900000),new Date(now+1)])expect(workerHeartbeatFresh(value,now)).toBe(false);
 });
});
