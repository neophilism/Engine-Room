import type {PortfolioProjectOverview} from './portfolio-overview';
import {effectiveProjectStatus} from './portfolio-statistics';
/** Summary and drilldown share these exact records, including archived and paused history. */
export function portfolioInventory(projects:readonly PortfolioProjectOverview[],now=new Date()) {
 const unique=new Map<string,PortfolioProjectOverview>();
 for(const project of projects){
  if(unique.has(project.id))throw new Error('Ambiguous duplicate project identity: '+project.id);
  unique.set(project.id,project);
 }
 const rows=[...unique.values()].map(project=>({id:project.id,name:project.displayName,
  repository:project.repositoryFullName??null,status:effectiveProjectStatus(project.status,project.activity?.total??0),
  recentActivity:!!project.activity?.lastObservedAt&&Date.parse(project.activity.lastObservedAt)<=now.getTime()&&
   now.getTime()-Date.parse(project.activity.lastObservedAt)<7*86400000}));
 return {registered:rows.length,active:rows.filter(p=>['active-development','beta','live','maintenance'].includes(p.status)).length,
  recent:rows.filter(p=>p.recentActivity).length,planned:rows.filter(p=>p.status==='planned').length,
  archived:rows.filter(p=>p.status==='archived').length,paused:rows.filter(p=>p.status==='paused').length,
  complete:rows.filter(p=>p.status==='complete').length,rows};
}
