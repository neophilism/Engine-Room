import React from 'react';
import Link from 'next/link';
import {portfolioInventory} from '../../lib/domain/portfolio-inventory';
import type {PortfolioProjectOverview} from '../../lib/domain/portfolio-overview';
export function InventoryReadout({projects}:{projects:readonly PortfolioProjectOverview[]}){
 const inventory=portfolioInventory(projects);
 return <details className="panel"><summary>Project inventory: {inventory.registered} registered · {inventory.active} active lifecycle · {inventory.recent} with PR activity in the last 7 days</summary>
  <p>Active lifecycle includes development, beta, live and maintenance. It does not mean an agent is working now. Archived, paused and completed projects remain in the registered inventory. Discovery excludes forks and configured repository exclusions; credential visibility may limit discovery.</p>
  <p>{inventory.planned} planned · {inventory.paused} paused · {inventory.archived} archived · {inventory.complete} complete</p>
  <ul>{inventory.rows.map(row=><li key={row.id}><Link href={'/projects/'+encodeURIComponent(projects.find(p=>p.id===row.id)?.slug??row.id)}>{row.name}</Link> · {row.status} · {row.repository??'repository link missing'}{row.recentActivity?' · recent PR activity':''}</li>)}</ul>
 </details>;
}
