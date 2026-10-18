import {describe,it,expect} from 'vitest';
import {evaluateDependencies,type DependencyNode} from './dependency-readiness';
const node=(key:string,more:Partial<DependencyNode>={}):DependencyNode=>({key,repository:key.split('#')[0],unitId:key.split('#')[1],mapped:true,merged:true,releaseIncluded:true,sourceCommit:'a'.repeat(40),dependencies:[],prerequisites:[],...more});
describe('upstream-first prerequisite evaluation',()=>{
 it('does not turn a locally merged downstream into upstream completion',()=>{
  const results=evaluateDependencies([node('o/engine#SI-42',{mapped:false,merged:false}),node('o/app#NSI-22',{dependencies:['o/engine#SI-42']})],['o/app#NSI-22']);
  expect(results[0].state).toBe('unknown');expect(results[0].reasons.join(' ')).toContain('SI-42');
 });
 it('evaluates transitive requirements and rejects cycles and missing sources',()=>{
  const nodes=[node('o/a#A-1',{dependencies:['o/b#B-1']}),node('o/b#B-1',{dependencies:['o/a#A-1']})];
  expect(evaluateDependencies(nodes,['o/a#A-1'])[0].reasons.join(' ')).toContain('cycle');
  expect(evaluateDependencies([],['o/missing#M-1'])[0].state).toBe('unknown');
 });
 it('keeps release inclusion, pinned source and unresolved prerequisites distinct from PR acceptance',()=>{
  expect(evaluateDependencies([node('o/a#A-1')],['o/a#A-1'])[0].state).toBe('satisfied');
  for(const patch of [{releaseIncluded:false},{sourceCommit:null},{prerequisites:['Live flow evidence']},{merged:false}])
   expect(evaluateDependencies([node('o/a#A-1',patch)],['o/a#A-1'])[0].state).not.toBe('satisfied');
 });
});
