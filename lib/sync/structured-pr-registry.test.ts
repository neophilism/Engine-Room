// @vitest-environment node
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {describe,it,expect} from 'vitest';
import {parseStructuredPrRegistry,snapshotPrToGitHub,attachObservedWorkIds} from './structured-pr-registry.mjs';

const time='2026-10-11T19:00:00.000Z';
const pr={id:1001,number:8,title:'PR-8: fix engine',url:'https://github.com/neophilism/Example/pull/8',
  state:'closed' as const,draft:false,createdAt:'2026-10-10T10:00:00.000Z',
  updatedAt:'2026-10-11T18:00:00.000Z',closedAt:'2026-10-11T18:00:00.000Z',
  mergedAt:'2026-10-11T18:00:00.000Z',headSha:null,baseRef:'main',mergeCommitSha:null};
const fixture={schemaVersion:1,repository:'neophilism/Example',roadmapVersion:1,observedAt:time,
  planVerified:true,plannedPrCount:2,units:[
    {id:'EX-01',title:'Shipped work',origin:'original',prs:[8]},
    {id:'EX-02',title:'Future work',origin:'addition',prs:[]}
  ],pullRequests:[pr]};
describe('structured PR registry, no Markdown parsing',()=>{
  it('extracts exact denominator, scopes, and explicit PR identities',()=>{
    const r=parseStructuredPrRegistry(JSON.stringify(fixture),'Example');
    expect(r.items.map(x=>x.numbers)).toEqual([[8],[]]);
    expect(r.items.map(x=>x.scope)).toEqual(['original','addition']);
    expect(snapshotPrToGitHub(r.pullRequests[0])).toMatchObject({id:1001,number:8,merged_at:pr.mergedAt});
  });
  it('rejects fabricated totals, cross-repository records and ambiguous IDs',()=>{
    expect(()=>parseStructuredPrRegistry(JSON.stringify({...fixture,plannedPrCount:3}),'Example')).toThrow();
    expect(()=>parseStructuredPrRegistry(JSON.stringify(fixture),'Wrong')).toThrow();
    expect(()=>parseStructuredPrRegistry(JSON.stringify({...fixture,units:[fixture.units[0],fixture.units[0]]}),'Example')).toThrow();
  });
  it('rejects a contradictory merged/open PR record and duplicate PR numbers',()=>{
    expect(()=>parseStructuredPrRegistry(JSON.stringify({...fixture,pullRequests:[{...pr,state:'open'}]}),'Example')).toThrow();
    expect(()=>parseStructuredPrRegistry(JSON.stringify({...fixture,pullRequests:[pr,pr]}),'Example')).toThrow();
  });
  it('requires explicit unverified-zero markers instead of inventing a denominator',()=>{
    const empty={...fixture,planVerified:false,plannedPrCount:0,units:[],pullRequests:[]};
    expect(parseStructuredPrRegistry(JSON.stringify(empty),'Example').items).toEqual([]);
    expect(()=>parseStructuredPrRegistry(JSON.stringify({...empty,planVerified:true}),'Example')).toThrow();
  });
  it('accepts native GitHub RFC3339 timestamps without fractional seconds',()=>{
    const withoutMilliseconds=(s:string|null)=>s?.replace(/\.000Z$/,'Z')??null;
    const record={...pr,createdAt:withoutMilliseconds(pr.createdAt)!,
      updatedAt:withoutMilliseconds(pr.updatedAt)!,
      closedAt:withoutMilliseconds(pr.closedAt)!,
      mergedAt:withoutMilliseconds(pr.mergedAt)!};
    const doc={...fixture,observedAt:withoutMilliseconds(time),pullRequests:[record]};
    expect(parseStructuredPrRegistry(JSON.stringify(doc),'Example').pullRequests[0].mergedAt)
      .toBe('2026-10-11T18:00:00Z');
    const invalid={...doc,pullRequests:[{...record,mergedAt:'2026-02-30T12:00:00Z'}]};
    expect(()=>parseStructuredPrRegistry(JSON.stringify(invalid),'Example')).toThrow();
  });
  it('validates every committed portfolio snapshot and keeps unrelated PRs outside the plan',async()=>{
    const root=join(process.cwd(),'registry/pr-snapshots');
    const files=(await readdir(root)).filter(x=>x.endsWith('.json'));
    expect(files).toHaveLength(42);
    for(const file of files){
      const name=file.slice(0,-5);
      const {document,items,pullRequests}=parseStructuredPrRegistry(await readFile(join(root,file),'utf8'),name);
      expect(document.plannedPrCount).toBe(items.length);
      const known=new Set(pullRequests.map(p=>p.number));
      expect(new Set(items.map(x=>x.sourceItemId)).size).toBe(items.length);
      // Future mapped PR references are allowed but must never count as merged
      // without a corresponding GitHub observation.
      const completed=items.filter(i=>i.numbers.length>0 && i.numbers.every(n=>
        known.has(n)&&pullRequests.find(p=>p.number===n)?.mergedAt));
      if(name==='Music-Analyzer'){
        expect(items).toHaveLength(16);
        expect(completed).toHaveLength(16);
        expect(items.flatMap(i=>i.numbers)).not.toContain(18);
      }
      if(name==='Engine-Room'){
        expect(items).toHaveLength(50);
        const added=[86,87,88].filter(n=>pullRequests.find(p=>p.number===n)?.mergedAt).length;
        expect(completed).toHaveLength(47+added);
        expect(items.at(-1)?.numbers).toEqual([88]);
      }
    }
  });
});

describe('live work-unit ID evidence',()=>{
  const units=[
    {ordinal:1,sourceItemId:'GDN-030',title:'Audit',numbers:[],scope:'original',reason:null},
    {ordinal:2,sourceItemId:'GDN-039',title:'Review',numbers:[],scope:'original',reason:null},
    {ordinal:3,sourceItemId:'GDN-016',title:'Existing',numbers:[16],scope:'original',reason:'Explicit'}
  ];
  it('maps exact unique GitHub PR title IDs without writing to source JSON',()=>{
    const original=JSON.stringify(units);
    const result=attachObservedWorkIds(units,[
      {number:28,title:'GDN-030: redacted and scoped audit'},
      {number:31,title:'GDN-039: dispute and review'},
      {number:30,title:'Fix numeric revision history and keyset pagination'},
      {number:17,title:'GDN-016 follow-up: concurrent recovery'}
    ]);
    expect(result.map(unit=>unit.numbers)).toEqual([[28],[31],[16]]);
    expect(result[0].reason).toContain('Exact work-unit ID');
    expect(JSON.stringify(units)).toBe(original);
  });
  it('does not guess when IDs are ambiguous, prefixes collide or PRs are already claimed',()=>{
    const result=attachObservedWorkIds([
      {ordinal:1,sourceItemId:'GDN-030',title:'Audit',numbers:[],scope:'original',reason:null},
      {ordinal:2,sourceItemId:'GDN-031',title:'Access',numbers:[29],scope:'original',reason:null}
    ],[
      {number:1,title:'GDN-030: version one'},
      {number:2,title:'GDN-030: version two'},
      {number:3,title:'GDN-0300: different milestone'},
      {number:29,title:'GDN-030: PR already assigned elsewhere'}
    ]);
    expect(result[0].numbers).toEqual([]);
    expect(result[1].numbers).toEqual([29]);
  });
});
