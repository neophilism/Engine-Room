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
    const partial=JSON.stringify({sourceRepository:'neophilism/Music_Video_Wizard',roadmapVersion:1,pullRequestNumbers:[1,null,null]});
    expect(parseApprovedManifestItems(manifest,'Music_Video_Wizard',partial).map(x=>x.numbers)).toEqual([[1],[],[]]);
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


describe("canonical cross-account milestone plans",()=>{
  it("imports all authored milestone headings without assuming ordinal means PR number",()=>{
    const body=[
      "# Live Competition Engine",
      "## Original numbered milestones",
      "#### LC-01 — Repository/application foundation",
      "#### LC-02 — Core domain model",
      "#### LC-03 — Authentication and identity",
      "## Handoff",
      "1. Read the README",
    ].join("\n");
    const items=parsePlanItems(body,"docs/DEVELOPMENT_PLAN.md","Live-Competition-Engine",[]);
    expect(items.map(x=>x.sourceItemId)).toEqual(["LC-01","LC-02","LC-03"]);
    expect(items.map(x=>x.numbers)).toEqual([[],[],[]]);
    expect(items.every(x=>x.scope==="original")).toBe(true);
  });

  it("keeps original FiresideChat 11 plus FC-P additions without a duplicate ordinal",()=>{
    const body=[
      "# FiresideChat plan",
      "### MVP-01 — Application foundation",
      "### MVP-02 — Registry",
      "### MVP-11 — Production acceptance",
      "### FC-P01 — Snapshot and census",
      "### FC-P20 — Complete archive coverage",
      "### FC-P21 — Podcast production inquiries",
    ].join("\n");
    const items=parsePlanItems(body,"docs/DEVELOPMENT_PLAN.md","FiresideChat");
    expect(items).toHaveLength(6);
    expect(items.map(x=>x.ordinal)).toEqual([1,2,3,4,5,6]);
    expect(items.map(x=>x.scope)).toEqual(["original","original","original","addition","addition","addition"]);
    expect(items[5].sourceItemId).toBe("FC-P21");
  });

  it("preserves FA original vs FC added FOIA coverage work",()=>{
    const body=[
      "# FOIA archive roadmap",
      "### FA-01 — Database recovery",
      "### FA-10 — Production scale gate",
      "### FC-01 — Federal source inventory",
      "### FC-14 — Broad coverage acceptance",
    ].join("\n");
    const items=parsePlanItems(body,"docs/DEVELOPMENT_PLAN.md","FOIA_Aggregator");
    expect(items.map(x=>x.scope)).toEqual(["original","original","addition","addition"]);
  });

  it("imports E2EESA audited remediation packages separately from provisional downstream slots",()=>{
    const body=[
      "# E2EESA audit remediation",
      "### AUD-01: Audit register",
      "### AUD-02: Canonical serializer",
      "### ROLL-01: Provisional downstream survey",
      "### AUD-26: Independent review",
    ].join("\n");
    const items=parsePlanItems(body,"docs/AUDIT_REMEDIATION_PLAN.md","End-To-End-Everywhere-Security-Architecture-Standard");
    expect(items.map(x=>x.sourceItemId)).toEqual(["AUD-01","AUD-02","AUD-26"]);
    expect(items.every(x=>x.scope==="addition")).toBe(true);
  });

  it("only maps PRs with exact work-unit ID, not coincidentally identical ordinal",()=>{
    const body=["# Civic","### CRT-01 — Foundation","### CRT-02 — Domain model","### CRT-03 — Schema"].join("\n");
    const prs=[
      {number:18,title:"CRT-01: Foundation"},
      {number:1,title:"Unrelated PR"},
      {number:22,title:"CRT-03: Schema"},
    ];
    const items=parsePlanItems(body,"docs/DEVELOPMENT_PLAN.md","Civic-Registry-Transparency-Engine",prs);
    expect(items.map(x=>x.numbers)).toEqual([[18],[],[22]]);
  });

  it("RAM phase roadmap is auditable and does not silently infer merged work",()=>{
    const body=JSON.stringify({items:[
      {id:"RAM-01",repository:"RAM-Marketplace",title:"Phase 0 — Definition",origin:"original",github_prs:[]},
      {id:"RAM-02",repository:"RAM-Marketplace",title:"Phase 1 — Foundation",origin:"original",github_prs:[]}
    ]});
    const items=parsePlanItems(body,"docs/engine-room-roadmap.json","RAM-Marketplace");
    expect(items).toHaveLength(2);
    expect(items.every(x=>x.numbers.length===0)).toBe(true);
  });
});


describe("reviewed historical mapping reuse",()=>{
  it("carries audited Fireside MVP GitHub references into the canonical plan while leaving new scope unmapped",()=>{
    const body = [
      "# Fireside",
      "### MVP-01 — Application and PostgreSQL data foundation",
      "### MVP-02 — Verified politician/podcast registry",
      "### MVP-11 — Production hardening and deployment",
      "### FC-P01 — Source audit and census",
    ].join("\n");
    const items = parsePlanItems(body,"docs/DEVELOPMENT_PLAN.md","FiresideChat");
    expect(items.map(item=>item.numbers)).toEqual([[1],[2],[19,21],[]]);
  });
});
