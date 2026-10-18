/** Read-only verification. Source uncertainty is never returned as a zero count. */
export function summarizeGitHubPulls(records){
 if(!Array.isArray(records))throw new Error('Invalid GitHub PR collection');
 const ids=new Set(),numbers=new Set();
 const counts={total:0,open:0,closed:0,merged:0,closedWithoutMerge:0,drafts:0};
 for(const pr of records){
  if(!Number.isSafeInteger(pr.id)||pr.id<1||!Number.isSafeInteger(pr.number)||pr.number<1||
   ids.has(pr.id)||numbers.has(pr.number)||!['open','closed'].includes(pr.state)||typeof pr.draft!=='boolean'||
   pr.merged_at&&(!Number.isFinite(Date.parse(pr.merged_at))||pr.state!=='closed'))throw new Error('Invalid or unstable GitHub PR pagination');
  ids.add(pr.id);numbers.add(pr.number);counts.total++;counts[pr.state]++;
  if(pr.merged_at)counts.merged++;else if(pr.state==='closed')counts.closedWithoutMerge++;
  if(pr.state==='open'&&pr.draft)counts.drafts++;
 }
 return counts;
}
export async function fetchCompletePrFacts(get,fullName){
 if(!/^[-\w.]+\/[-\w.]+$/.test(fullName))throw new Error('Invalid repository coordinates');
 const records=[];
 // Creation order prevents ordinary PR updates from moving records across pages.
 for(let page=1;page<=100;page++){
  const batch=await get('/repos/'+fullName+'/pulls?state=all&sort=created&direction=asc&per_page=100&page='+page);
  if(!Array.isArray(batch))throw new Error('Invalid GitHub collection');
  records.push(...batch);
  if(batch.length<100)return summarizeGitHubPulls(records);
 }
 throw new Error('GitHub pagination bound exceeded; observation incomplete');
}
export async function auditPortfolioAccuracy(db,{get,owner='neophilism',concurrency=4}={}){
 if(typeof get!=='function'||!/^[-\w]+$/.test(owner))throw new Error('Authorized GitHub reader required');
 const stored=(await db.query(`SELECT r.id,r.full_name,count(g.id)::integer AS total,
  count(g.id) FILTER(WHERE g.state='open')::integer AS open,
  count(g.id) FILTER(WHERE g.state='closed')::integer AS closed,
  count(g.id) FILTER(WHERE g.merged_at IS NOT NULL)::integer AS merged,
  count(g.id) FILTER(WHERE g.state='closed' AND g.merged_at IS NULL)::integer AS "closedWithoutMerge",
  count(g.id) FILTER(WHERE g.state='open' AND g.draft)::integer AS drafts,
  s.last_success_at,s.last_error,now() AS database_observed_at
  FROM repositories r LEFT JOIN github_pull_requests g ON g.repository_id=r.id
  LEFT JOIN github_repository_sync s ON s.repository_id=r.id
  WHERE lower(r.owner_login)=lower($1) AND NOT r.archived AND EXISTS(SELECT 1 FROM project_repositories pr WHERE pr.repository_id=r.id)
  GROUP BY r.id,s.last_success_at,s.last_error ORDER BY r.full_name`,[owner])).rows;
 const repositories=[];let cursor=0;
 async function worker(){while(cursor<stored.length){
  const row=stored[cursor++],base={repositoryId:row.id,repository:row.full_name,
   stored:Object.fromEntries(['total','open','closed','merged','closedWithoutMerge','drafts'].map(k=>[k,Number(row[k])])),
   databaseObservedAt:new Date(row.database_observed_at).toISOString(),lastSuccessfulSyncAt:row.last_success_at?new Date(row.last_success_at).toISOString():null};
  try{
   const live=await fetchCompletePrFacts(get,row.full_name);
   const differences=Object.keys(live).filter(key=>live[key]!==base.stored[key]);
   repositories.push({...base,live,status:differences.length?'different':'matched',differences});
  }catch{repositories.push({...base,live:null,status:'unknown',reason:'GitHub observation unavailable, inaccessible, rate-limited or incomplete; stored facts retained'});}
 }}
 await Promise.all(Array.from({length:Math.min(stored.length,Math.max(1,concurrency))},worker));
 repositories.sort((a,b)=>a.repository.localeCompare(b.repository));
 return {scope:owner,tracked:stored.length,matched:repositories.filter(r=>r.status==='matched').length,
  different:repositories.filter(r=>r.status==='different').length,unknown:repositories.filter(r=>r.status==='unknown').length,
  note:'Read-only comparison of a database observation with subsequent complete GitHub observations. Active PR changes can produce a real difference during the comparison window. No project records are mutated.',repositories};
}
