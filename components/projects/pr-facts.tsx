import React from 'react';
import type { PullRequestSummary } from '../../lib/domain/pr-summary';
import {githubRepositoryUrl} from '../../lib/domain/portfolio-query';
export function PrFacts({summary,repository}:{summary?:PullRequestSummary;repository?:string}){
  if(!summary)return <p className="metric-freshness">GitHub PR counts unavailable.</p>;
  const base=githubRepositoryUrl(repository);
  const rows=[['Open',summary.open,'is:pr is:open'],['Closed',summary.closed,'is:pr is:closed'],
    ['Merged',summary.merged,'is:pr is:merged'],['Closed without merge',summary.closedWithoutMerge,'is:pr is:unmerged is:closed']] as const;
  return <div className="pr-facts" aria-label="GitHub pull request counts">
    <dl className="pr-fact-counts">{rows.map(([label,count,query])=><div key={label}><dt>{label}</dt><dd>{base?
      <a href={base+'/pulls?q='+encodeURIComponent(query)} target="_blank" rel="noopener noreferrer">{count}</a>:count}</dd></div>)}</dl>
    <p className="metric-freshness">{summary.total} total PRs · {summary.drafts} open drafts · {summary.observedAt?`Repository observation: ${new Date(summary.observedAt).toISOString()}`:'Full repository synchronization not yet verified'}</p>
  </div>;
}
