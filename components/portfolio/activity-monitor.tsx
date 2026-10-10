"use client";
import React,{useEffect,useState} from 'react';
import Link from 'next/link';
import type { PortfolioProjectOverview } from '../../lib/domain/portfolio-overview';
import { projectDashboardHref } from '../../lib/domain/project-dashboard';
import { BrassPanel } from '../machine';

export function ActivityMonitor({projects}:{projects:readonly PortfolioProjectOverview[]}){
  const [compact,setCompact]=useState(false);
  useEffect(()=>{try{setCompact(localStorage.getItem('engine-room-compact-monitor')==='1');}catch{}},[]);
  const toggle=()=>{const next=!compact;setCompact(next);try{localStorage.setItem('engine-room-compact-monitor',next?'1':'0');}catch{}};
  const rows=projects.flatMap(p=>(p.pullRequests||[]).filter(pr=>pr.state==='open').map(pr=>({project:p,pr})))
    .sort((a,b)=>Number(b.pr.checks==='failing')-Number(a.pr.checks==='failing')||b.pr.updatedAt.localeCompare(a.pr.updatedAt));
  const merged=projects.flatMap(p=>(p.pullRequests||[]).filter(pr=>pr.state==='merged').map(pr=>({project:p,pr})))
    .sort((a,b)=>b.pr.updatedAt.localeCompare(a.pr.updatedAt)).slice(0,20);
  const isPlanned=(p:PortfolioProjectOverview,number:number)=>
    !!p.sourcePlan?.items.some(item=>item.numbers.includes(number));
  return <BrassPanel title="Current development activity" eyebrow="All tracked repositories" className={compact?'activity-monitor compact':'activity-monitor'}>
    <div className="monitor-toolbar"><p>{rows.length} open PRs · {rows.filter(x=>x.pr.checks==='failing').length} with failed checks · {rows.filter(x=>x.pr.draft).length} drafts</p>
      <button type="button" className="portfolio-control-button" onClick={toggle} aria-pressed={compact}>Compact monitor</button></div>
    {rows.length?<div className="monitor-table-wrap"><table className="monitor-table"><thead><tr><th>Project</th><th>Pull request</th><th>Checks</th><th>Merge / review</th></tr></thead>
      <tbody>{rows.map(({project,pr})=><tr key={project.id+':'+pr.number} className={pr.checks==='failing'?'monitor-failing':undefined}>
        <td><Link href={projectDashboardHref(project)}>{project.displayName}</Link></td>
        <td><a href={pr.url} target="_blank" rel="noopener noreferrer">#{pr.number} {pr.title}</a><small>{isPlanned(project,pr.number)?'Tracked planned work':'Plan mapping N/A'}{pr.draft?' · Draft':''}</small></td>
        <td>{pr.checksUrl?<a href={pr.checksUrl} target="_blank" rel="noopener noreferrer">{pr.checks}</a>:pr.checks}<small>{pr.checksAt?`Observed ${new Date(pr.checksAt).toLocaleTimeString()}`:'Check feed unavailable'}</small></td>
        <td>{pr.mergeable===false?'Conflicts':pr.mergeable===true?'No merge conflicts':'Merge status N/A'}{pr.reviewSummary&&<small>{pr.reviewSummary}</small>}<small>Target: {pr.baseRef||'N/A'} · <a href={pr.url+'/files'} target="_blank" rel="noopener noreferrer">Review changes</a></small></td>
      </tr>)}</tbody></table></div>:<p>No open PRs in the imported records. Source freshness is shown in the header.</p>}
    {merged.length>0&&<details><summary>Recently merged repository work</summary><ul>{merged.map(({project,pr})=><li key={project.id+':'+pr.number}>
      {project.displayName}: <a href={pr.url} target="_blank" rel="noopener noreferrer">#{pr.number} {pr.title}</a> · {pr.releaseMerge===true?'Merged into release branch':pr.releaseMerge===false?'Merged into an intermediate branch':'Merge target N/A'}</li>)}</ul></details>}
  </BrassPanel>;
}
