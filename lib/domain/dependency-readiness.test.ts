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
 it('evaluates shared prerequisite graphs without exponential repeated traversal',()=>{
  let reads=0;
  const nodes=Array.from({length:80},(_,i)=>{
   const value=node('o/dense#U-'+i);
   Object.defineProperty(value,'dependencies',{get(){
    if(++reads>1000)throw new Error('Repeated dependency traversal exceeded the workload budget');
    return Array.from({length:i},(_,j)=>'o/dense#U-'+j);
   }});
   return value;
  });
  expect(evaluateDependencies(nodes,['o/dense#U-79'])).toMatchObject([{state:'satisfied',reasons:[]}]);
  expect(reads).toBeLessThan(1000);
 });
 it('handles deep source plans without recursive call-stack exhaustion',()=>{
  const nodes=Array.from({length:6000},(_,i)=>node('o/deep#U-'+i,{dependencies:i?['o/deep#U-'+(i-1)]:[]}));
  expect(evaluateDependencies(nodes,['o/deep#U-5999'])[0].state).toBe('satisfied');
 });
 it('propagates concrete failures throughout cycles and to their dependents',()=>{
  const nodes=[node('o/cycle#A',{dependencies:['o/cycle#B']}),node('o/cycle#B',{dependencies:['o/cycle#A','o/engine#blocked']}),
   node('o/engine#blocked',{merged:false}),node('o/app#consumer',{dependencies:['o/cycle#A']})];
  for(const result of evaluateDependencies(nodes,['o/cycle#A','o/cycle#B','o/app#consumer'])){
   expect(result.state).toBe('incomplete');
   expect(result.reasons.join(' ')).toContain('cycle');
   expect(result.reasons.join(' ')).toContain('unmerged PRs');
  }
 });
});
