import {it,expect} from 'vitest';
import {loadProjectMonitorData} from './live-monitor';
it('carries source implementation evidence through the database view without accepting unmapped PRs',async()=>{
 const review={implementation:'implemented',reviewedAt:'2026-10-19T00:00:00Z',softwareGap:null,activationRequirement:'Set final video.',sourceFiles:[{path:'apps/web/page.mjs',sha256:'a'.repeat(64)}]};
 const query=async(sql:string)=>{
  if(sql.includes('SELECT pr.project_id,g.number'))return {rows:[]};
  if(sql.includes('SELECT DISTINCT ON(pr.project_id'))return {rows:[{project_id:'project',repository_id:'repo',path:'registry/prs.json',fingerprint:'source',source_commit:'b'.repeat(40),source_url:'https://github.com/neophilism/Galinsky-2028/blob/main/registry/prs.json',repository_url:'https://github.com/neophilism/Galinsky-2028',title:'Plan',imported_at:'2026-10-19T00:00:00Z',versions:'1'}]};
  expect(sql).toContain('source_metadata');
  return {rows:[{ordinal:1,title:'Working page',scope:'original',github_pr_numbers:[],contributing_pr_numbers:[8],source_metadata:{implementationReview:review},completed:false,underway:true,unverified:false}]};
 };
 const data=await loadProjectMonitorData({query} as unknown as Parameters<typeof loadProjectMonitorData>[0]);
 const plan=data.plans.get('project')!;
 expect(plan.originalComplete).toBe(0);expect(plan.unmapped).toBe(1);expect(plan.items[0].state).toBe('in-progress');expect(plan.items[0].implementationReview).toEqual(review);
});
