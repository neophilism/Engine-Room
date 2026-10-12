// @vitest-environment node
import {readFile} from 'node:fs/promises';
import {describe,it,expect,vi} from 'vitest';
import type {PoolClient} from 'pg';
import {parseSecurityStatus,evaluateSecurityStatus,sourceFingerprint,securityScopeIncluded,syncSecurityStatus,REQUIRED_CONTROLS,REQUIRED_GATES} from './e2eesa-status.mjs';
const repository='neophilism/Engine-Room',hash='a'.repeat(64),at='2026-10-12T12:00:00Z';
async function complete(){
 const s=parseSecurityStatus(await readFile('security/e2eesa-status.json','utf8'),repository);
 s.source.digest=hash;s.inventory.reviewed=true;s.implementation.complete=true;s.implementation.evidence=['evidence.md'];
 s.implementation.controls=REQUIRED_CONTROLS.map(id=>({id,state:'implemented',evidence:['evidence.md']}));
 s.testing.complete=true;s.testing.evidence=['report.json'];
 s.testing.checks=REQUIRED_GATES.map(kind=>({kind,status:'passed',sourceDigest:hash,completedAt:at,toolDigest:hash,configurationDigest:hash,report:'report.json'}));
 return s;
}
const options={fingerprint:hash,paths:['evidence.md','report.json','security/e2eesa-inventory.json'],now:Date.parse(at)};
describe('source-bound independent security stages',()=>{
 it('does not count documentation as implemented/tested/expert-reviewed',async()=>{
 const s=parseSecurityStatus(await readFile('security/e2eesa-status.json','utf8'),repository);
 expect(evaluateSecurityStatus(s)).toMatchObject({implemented:false,tested:false,independentReview:false,certificationEligible:false});
 });
 it('accepts current complete development evidence with expert review still pending',async()=>{
 expect(evaluateSecurityStatus(await complete(),options)).toMatchObject({implemented:true,tested:true,independentReview:false,certificationEligible:false});
 });
 it('invalidates checked stages when source changes',async()=>{
 expect(evaluateSecurityStatus(await complete(),{...options,fingerprint:'b'.repeat(64)})).toMatchObject({implemented:false,tested:false,independentReview:false});
 });
 it.each(['failed','skipped','cancelled','running'])('refuses a %s required gate',async status=>{
 const s=await complete();s.testing.checks[0].status=status;expect(evaluateSecurityStatus(s,options).tested).toBe(false);
 });
 it('refuses stale and future-dated evidence',async()=>{
 for(const date of ['2026-10-01T12:00:00Z','2026-10-13T12:00:00Z']){
 const s=await complete();s.testing.checks[0].completedAt=date;expect(evaluateSecurityStatus(s,options).tested).toBe(false);
 }
 });
 it('requires owner acceptance and independent qualified expert identities',async()=>{
 const s=await complete();s.independentReview={...s.independentReview,complete:true,sourceDigest:hash,evidence:['evidence.md'],reviewers:[{name:'Synthetic test reviewer',independent:false,qualified:true}],ownerAccepted:true};
 expect(evaluateSecurityStatus(s,options).independentReview).toBe(false);
 s.independentReview.reviewers[0].independent=true;s.independentReview.ownerAccepted=false;
 expect(evaluateSecurityStatus(s,options).independentReview).toBe(false);
 s.independentReview.ownerAccepted=true;
 expect(evaluateSecurityStatus(s,options)).toMatchObject({independentReview:true,certificationEligible:false});
 });
 it('rejects out-of-order and cross-repository records',async()=>{
 const s=await complete();s.implementation.complete=false;
 expect(()=>parseSecurityStatus(JSON.stringify(s),repository)).toThrow('out of order');
 expect(()=>parseSecurityStatus(JSON.stringify(s),'neophilism/Other')).toThrow('identity');
 });
 it('does not exempt unknown private repositories by age',()=>{
 expect(securityScopeIncluded({full_name:'neophilism/Private'})).toBeNull();
 expect(securityScopeIncluded({full_name:'neophilism/Old',created_at:'2025-01-01'})).toBe(false);
 expect(securityScopeIncluded({full_name:'neophilism/FOIA_Bias_Analysis',created_at:'2025-01-01'})).toBe(true);
 });
 it('binds source, documentation and submodules; attestation-only updates preserve the digest',()=>{
 const r={path:'source.ts',type:'blob',mode:'100644',sha:'1'.repeat(40)},one=sourceFingerprint({tree:[r]});
 expect(sourceFingerprint({tree:[r,{...r,path:'security/e2eesa-status.json'},{...r,path:'security/e2eesa-evidence/report.json'}]})).toBe(one);
 expect(sourceFingerprint({tree:[r,{...r,path:'README.md'}]})).not.toBe(one);
 expect(sourceFingerprint({tree:[r,{...r,path:'vendor/engine',type:'commit',mode:'160000'}]})).not.toBe(one);
 expect(()=>sourceFingerprint({tree:[r],truncated:true})).toThrow('Complete source');
 });
 it('records absent GitHub status as missing without declaring successful assessment',async()=>{
 const query=vi.fn(async(_sql:string,_params:unknown[])=>({rows:[],rowCount:1}));
 const result=await syncSecurityStatus({query} as unknown as Pick<PoolClient,'query'>,{id:'repo',full_name:repository,default_branch:'main',created_at:'2026-10-07'},async()=>{throw Object.assign(new Error('missing'),{status:404});},{sha:'1'.repeat(40)});
 expect(result).toBe('missing');expect(query.mock.calls[0][1]).toEqual(expect.arrayContaining(['missing']));
 });
});
