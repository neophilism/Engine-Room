import {describe,it,expect} from 'vitest';
import {verifyRuntimePins} from './runtime-pins.mjs';
describe('immutable runtime locks',()=>{
 const declared={repository:'o/engine',sourceCommit:'a'.repeat(40),version:'1.0.0-rc.9'};
 it('matches exact source and version without treating a prerelease as stable',()=>{
  expect(verifyRuntimePins([declared],{engine:declared})[0]).toMatchObject({matched:true,version:'1.0.0-rc.9'});
  expect(verifyRuntimePins([declared],{engine:{...declared,sourceCommit:'b'.repeat(40)}})[0].matched).toBe(false);
  expect(verifyRuntimePins([declared],null)[0].matched).toBe(false);
 });
});
