import {describe,it,expect} from 'vitest';
import {sourceFreshness,pollingMinutes} from './source-freshness';
describe('source freshness policy',()=>{
 const now=Date.parse('2026-10-18T21:00:00Z');
 it('distinguishes ever synchronized from current evidence',()=>{
  expect(sourceFreshness('2026-10-18T18:30:00Z',null,now,15)).toBe('stale');
  expect(sourceFreshness('2026-10-18T20:50:00Z',null,now,15)).toBe('current');
  expect(sourceFreshness('2026-10-18T20:00:00Z',null,now,pollingMinutes(false))).toBe('current');
 });
 it('rejects errors, missing or invalid dates and future clock skew beyond two minutes',()=>{
  expect(sourceFreshness(null,null,now,15)).toBe('missing');
  expect(sourceFreshness('bad',null,now,15)).toBe('invalid');
  expect(sourceFreshness('2026-10-19T21:00:00Z',null,now,15)).toBe('invalid');
  expect(sourceFreshness('2026-10-18T20:55:00Z','HTTP 503',now,15)).toBe('error');
 });
});
