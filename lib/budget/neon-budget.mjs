/**
 * Neon Launch usage guard. Billing data is delayed (~15 minutes); this is a
 * best-effort application shutoff, NOT a contractual provider spending limit.
 * Requires a read-capable NEON_API_KEY in Render's private environment.
 */
const PROJECT_ID='damp-hat-24238816';
const ORG_ID='org-odd-fog-35797211';
const METRICS='compute_unit_seconds,root_branch_bytes_month,child_branch_bytes_month,instant_restore_bytes_month,snapshot_storage_bytes_month,public_network_transfer_bytes,private_network_transfer_bytes,extra_branches_month';
export const BUDGET_USD=10;
export const PAUSE_AT_USD=8;
const USD_PER_CU_HOUR=0.106;
const USD_PER_GB_MONTH=0.35;
const GB=1_000_000_000;
let memo={at:0,value:null};
export function estimateNeonUsage(response){
  const project=response?.projects?.find(p=>p.project_id===PROJECT_ID);
  if(!project)return null;
  const sums={};
  let lastObserved=null;
  for(const period of project.periods||[]){
    for(const point of period.consumption||[]){
      if(point.timeframe_end && (!lastObserved||point.timeframe_end>lastObserved))lastObserved=point.timeframe_end;
      for(const item of point.metrics||[]){
        if(typeof item.value==='number' && Number.isFinite(item.value) && item.value>=0)
          sums[item.metric_name]=(sums[item.metric_name]||0)+item.value;
      }
    }
  }
  if(!('compute_unit_seconds' in sums))return null;
  const compute=sums.compute_unit_seconds/3600*USD_PER_CU_HOUR;
  // Neon reports byte-month figures per billing interval, not raw data size.
  const storage=['root_branch_bytes_month','child_branch_bytes_month',
    'instant_restore_bytes_month','snapshot_storage_bytes_month']
    .reduce((total,name)=>total+(sums[name]||0),0)/GB*USD_PER_GB_MONTH;
  const estimated=compute+storage;
  return {spentUSD:Math.round(estimated*10000)/10000,computeUSD:compute,storageUSD:storage,
    totalDataTransferBytes:(sums.public_network_transfer_bytes||0)+(sums.private_network_transfer_bytes||0),
    lastObserved,thresholdUSD:PAUSE_AT_USD,limitUSD:BUDGET_USD,
    paused:estimated>=PAUSE_AT_USD,method:'metered-estimate',
    note:'Estimate excludes any fixed minimums, transfer overages, extra branches, and other external service charges.'};
}
export async function readNeonBudget(env=process.env, fetcher=fetch){
  if(!env.NEON_API_KEY) return {status:'unconfigured',paused:true,spentUSD:null,thresholdUSD:PAUSE_AT_USD,limitUSD:BUDGET_USD};
  if(memo.value&&Date.now()-memo.at<15*60000)return memo.value;
  try{
    const now=new Date();const from=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString();
    const url=new URL('https://console.neon.tech/api/v2/consumption_history/v2/projects');
    url.searchParams.set('project_ids',PROJECT_ID);url.searchParams.set('org_id',ORG_ID);
    url.searchParams.set('from',from);url.searchParams.set('to',now.toISOString());
    url.searchParams.set('granularity','daily');url.searchParams.set('metrics',METRICS);
    const r=await fetcher(url.toString(),{headers:{Authorization:'Bearer '+env.NEON_API_KEY,Accept:'application/json'},signal:AbortSignal.timeout(10000),cache:'no-store'});
    if(!r.ok)throw Error('Neon usage endpoint status '+r.status);
    const measure=estimateNeonUsage(await r.json());
    if(!measure)throw Error('Neon usage unavailable');
    const value={status:measure.paused?'paused':'tracking',...measure};
    memo={at:Date.now(),value};return value;
  }catch {
    // Do not continue unattended paid work when usage cannot be checked.
    return {status:'unavailable',paused:true,spentUSD:null,thresholdUSD:PAUSE_AT_USD,limitUSD:BUDGET_USD};
  }
}
