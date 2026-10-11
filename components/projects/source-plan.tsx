import React from "react";
import Link from "next/link";
import type { SourcePlanSummary } from "../../lib/domain/live-monitor";

export function SourcePlan({ plan, historyHref }: { plan: SourcePlanSummary | undefined; historyHref?: string }) {
  if (!plan) return <p>Plan source N/A. Repository activity remains visible while the plan is located.</p>;
  const planned=plan.original+plan.added;
  const completed=plan.originalComplete+plan.addedComplete;
  const inProgress=plan.items.filter(item=>item.state==="in-progress").length;
  const remaining=Math.max(0,planned-completed-inProgress);
  const unlinked=Math.min(remaining,plan.unmapped);
  const otherUnfinished=remaining-unlinked;
  return <div className="source-plan">
    <p><strong>{completed}/{planned} merged</strong> · {inProgress} mapped open / unmerged ·
      {" "}{unlinked} missing verified PR mapping · {otherUnfinished} other unfinished / unverified units.
      All original and later work counts in one roadmap total.</p>
    <ul>{plan.documents.map(doc=><li key={doc.path}>
      {/^https:\/\//.test(doc.url)?
        <a href={doc.url} target="_blank" rel="noopener noreferrer">{doc.title}</a>:doc.title}
      {" · "}{doc.versions} stored version{doc.versions===1?"":"s"}
    </li>)}</ul>
    {historyHref&&<p><Link href={historyHref}>View stored plan history</Link></p>}
    <details><summary>Merged, open, and remaining work</summary>
      <ol className="source-plan-items">
        {plan.items.map((item,index)=><li className={item.state==="merged"?"source-work-merged":
          item.state==="in-progress"?"source-work-open":"source-work-remaining"} key={index}>
          <strong>{item.ordinal}. {item.title}</strong>
          <span>{item.state==="unmapped"?"Completion evidence not mapped":
            item.state==="in-progress"?"Open / awaiting merge":
            item.state==="merged"?"Merged":item.state}</span>
          {item.numbers.map(number=><a key={number}
            href={(item.repositoryUrl||item.sourceUrl.split("/blob/")[0])+"/pull/"+number}
            target="_blank" rel="noopener noreferrer">PR #{number}</a>)}
        </li>)}
      </ol>
    </details>
  </div>;
}
