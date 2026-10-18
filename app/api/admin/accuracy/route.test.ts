// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
vi.mock('../../../../lib/server/request-admin',()=>({isRequestAdmin:async()=>false}));
import {GET} from './route';
describe('private portfolio accuracy report',()=>{
 it('denies unauthenticated access before database or provider work',async()=>{
  const result=await GET(new Request('https://example.test/api/admin/accuracy'));
  expect(result.status).toBe(403);expect(result.headers.get('cache-control')).toBe('no-store');
 });
});
