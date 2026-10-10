// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {parsePlanItems} from './plan-import.mjs';

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
});
