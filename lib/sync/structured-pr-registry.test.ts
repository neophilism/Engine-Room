// @vitest-environment node
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {describe,it,expect} from 'vitest';
import {parseStructuredPrRegistry,snapshotPrToGitHub} from './structured-pr-registry.mjs';

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
        expect(items).toHaveLength(45);
        expect(completed).toHaveLength(45);
      }
    }
  });
});
