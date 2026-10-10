// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {parsePlanItems,parseApprovedManifestItems} from './plan-import.mjs';

describe('source plan evidence',()=>{
  it('isolates roadmap lists and never treats an ordinal as a GitHub PR number',()=>{
    const body='# Product\n## MVP roadmap\n1. Accounts\n2. Search\n## Install\n1. Install packages\n2. Run migrations';
    const items=parsePlanItems(body,'README.md','Product',[{number:81,title:'PR 2: Accounts'},{number:2,title:'Unrelated work'}]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ordinal:1,numbers:[81],reason:'Unique exact work-title match'});
    expect(items[1].numbers).toEqual([]);
  });
  it('leaves ambiguous matches unmapped and ignores prose with repeated numbered lists',()=>{
    expect(parsePlanItems('1. Accounts','docs/roadmap.md','Product',[{number:3,title:'Accounts'},{number:8,title:'PR 1: Accounts'}])[0].numbers).toEqual([]);
    expect(parsePlanItems('1. Install\n2. Run\n\n1. Other','README.md','Product')).toEqual([]);
  });
  it('keeps explicit multi-PR evidence, shared work, and original/addition labels',()=>{
    const body=JSON.stringify({items:[{id:'DAE-01',title:'Contracts',github_prs:[4,7],origin:'original'},
      {id:'DAE-02',title:'Integration',github_pr:7,origin:'added'}, {id:'SS-01',title:'Consumer',github_pr:3}]});
    const items=parsePlanItems(body,'docs/roadmap.json','Distributed-Audio-Engine');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({numbers:[4,7],scope:'original'});
    expect(items[1]).toMatchObject({numbers:[7],scope:'addition'});
  });
  it('accepts source document PR headings without Markdown decoration',()=>{
    const items=parsePlanItems('PR 1 — Accounts\nDeliver: scope\nPR 2 — Media ingest\n','source.txt','Wizard');
    expect(items.map(x=>x.title)).toEqual(['Accounts','Media ingest']);
  });
  it('uses reviewed capability mappings instead of matching Fireside roadmap ordinals to PR numbers',()=>{
    const items=parsePlanItems('## MVP roadmap\n1. Production hardening and deployment','README.md','FiresideChat');
    expect(items[0].numbers).toEqual([19,21]);
  });
  it('discovers a valid approved 63-unit manifest with a nonconsecutive exact mapping',()=>{
    const manifest='project:\n  repository: neophilism/Music_Video_Wizard\nroadmap:\n  version: 1\n  planned_prs: 3\n  approved: true\nmilestones:\n  - name: First phase\n    prs: 2\n  - name: Launch readiness\n    prs: 1\n';
    const mapping=JSON.stringify({sourceRepository:'neophilism/Music_Video_Wizard',roadmapVersion:1,pullRequestNumbers:[1,3,5]});
    const items=parsePlanItems(manifest,'.exechub/project.yml','Music_Video_Wizard',[],mapping);
    expect(items).toHaveLength(3);
    expect(items.map(x=>x.numbers)).toEqual([[1],[3],[5]]);
    expect(items.map(x=>x.scope)).toEqual(['original','original','original']);
    expect(parseApprovedManifestItems(manifest,'Music_Video_Wizard').map(x=>x.numbers)).toEqual([[],[],[]]);
    expect(()=>parseApprovedManifestItems(manifest,'Other')).toThrow();
    expect(()=>parseApprovedManifestItems(manifest,'Music_Video_Wizard',JSON.stringify({sourceRepository:'neophilism/Music_Video_Wizard',roadmapVersion:1,pullRequestNumbers:[1,1,3]}))).toThrow();
    expect(()=>parseApprovedManifestItems(manifest.replace('  approved: true','  approved: false'),'Music_Video_Wizard')).toThrow();
  });

  it('matches a unique structured DRE identifier in a merged PR title without guessing the ordinal',()=>{
    const body=JSON.stringify({items:[
      {id:'DRE-09',title:'Advertising accounts',origin:'added'},
      {id:'DRE-10',title:'Not yet built',origin:'added'}
    ]});
    const items=parsePlanItems(body,'docs/roadmap.json','Distributed-Radio-Engine',
      [{number:11,title:'DRE-09: approved common-program sponsorship accounting'}]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ordinal:9,numbers:[11],reason:'Unique explicit roadmap ID in GitHub PR title'});
    expect(items[1]).toMatchObject({ordinal:10,numbers:[]});
    const ambiguous=parsePlanItems(body,'docs/roadmap.json','Distributed-Radio-Engine',
      [{number:11,title:'DRE-09: option A'},{number:12,title:'DRE-09: option B'}]);
    expect(ambiguous[0].numbers).toEqual([]);
  });

  it('treats partial Music Operations milestones as unfinished despite merged PR references',()=>{
    const body=JSON.stringify({project:'Music-Operations-Engine',baselineMilestones:2,addedMilestones:1,
      milestones:[
        {id:1,title:'Foundation',origin:'baseline',implementationStatus:'implemented',pullRequests:[1]},
        {id:2,title:'Accounts',origin:'baseline',implementationStatus:'partial',pullRequests:[2]},
        {id:3,title:'Multi-label reporting',origin:'added',implementationStatus:'implemented',pullRequests:[2,3]}
      ]});
    const items=parsePlanItems(body,'docs/roadmap.json','Music-Operations-Engine');
    expect(items.map(x=>x.numbers)).toEqual([[1],[],[2,3]]);
    expect(items.map(x=>x.scope)).toEqual(['original','original','addition']);
    expect(()=>parsePlanItems(body,'docs/roadmap.json','Another-Engine')).toThrow();
  });

});
