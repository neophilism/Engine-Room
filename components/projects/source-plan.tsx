import React from 'react';
import Link from 'next/link';
import type { SourcePlanSummary } from '../../lib/domain/live-monitor';
export function SourcePlan({plan,historyHref}:{plan:SourcePlanSummary|undefined;historyHref?:string}){
  if(!plan)return <p>Plan source N/A. Repository activity remains visible while the plan is located.</p>;
  return <div className="source-plan"><p><span className="original-work">Original roadmap: {plan.original?`${plan.originalComplete}/${plan.original} items verified merged`:'N/A'}</span>{' · '}
    <span className="added-work">Added work: {plan.added?`${plan.addedComplete}/${plan.added} items verified merged`:'none in imported plans'}</span> · {plan.unmapped} items await completion evidence</p>
    <ul>{plan.documents.map(doc=><li key={doc.path}>{/^https:\/\//.test(doc.url)?<a href={doc.url} target="_blank" rel="noopener noreferrer">{doc.title}</a>:doc.title} · {doc.versions} stored version{doc.versions===1?'':'s'}</li>)}</ul>
    {historyHref&&<p><Link href={historyHref}>View stored plan history</Link></p>}
    <details><summary>Finished, underway, and remaining work</summary><ol className="source-plan-items">{plan.items.map((item,index)=><li className={item.scope==='original'?'original-work':'added-work'} key={index}>
      <strong>{item.ordinal}. {item.title}</strong><span>{item.state==='unmapped'?'Completion evidence not mapped':item.state}</span>
      {item.numbers.map(number=><a key={number} href={(item.repositoryUrl||item.sourceUrl.split('/blob/')[0])+'/pull/'+number} target="_blank" rel="noopener noreferrer">PR #{number}</a>)}
    </li>)}</ol></details></div>;
}
