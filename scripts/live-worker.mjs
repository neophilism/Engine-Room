import { Pool } from 'pg';
import { processWebhookInbox } from '../lib/sync/github-runtime.mjs';
import { probeGitHubAccess } from '../lib/sync/github-access-probe.mjs';
import { reconcilePortfolio } from '../lib/sync/reconcile.mjs';
import { reconcilePlanSources } from '../lib/sync/plan-source-sync.mjs';
import {seedRepositoryAbout} from '../lib/sync/repository-about.mjs';

const pool=new Pool({connectionString:process.env.DATABASE_URL||process.env.DATABASE_URL_UNPOOLED,max:3,connectionTimeoutMillis:10000});
let stopping=false,inboxBusy=false,syncBusy=false,plansBusy=false;
async function inbox(){
  if(stopping||inboxBusy)return;
  inboxBusy=true;
  try{await processWebhookInbox(pool);await pool.query('UPDATE engine_room_live_state SET last_worker_at=now() WHERE singleton=true');}
  catch{console.error('Webhook worker unavailable; durable inbox preserved.');}
  finally{inboxBusy=false;}
}
async function sync(force=false){
  if(stopping||syncBusy)return;
  syncBusy=true;
  try{console.info('Portfolio reconciliation',await reconcilePortfolio(pool,force?{force:true,quick:true,repositoryLimit:100,concurrency:5}:{}));}
  catch{console.error('Portfolio reconciliation unavailable; existing source records preserved.');
    await pool.query("UPDATE engine_room_live_state SET last_error='GitHub authentication or source connection unavailable' WHERE singleton=true").catch(()=>{});}
  finally{syncBusy=false;}
}
// Plan refresh is independent of the rate-limited GitHub PR API. It must keep
// the documented denominator populated even when PR evidence is stale.
async function plans() {
  if(stopping||plansBusy)return;
  plansBusy=true;
  try {
    const result=await reconcilePlanSources(pool);
    console.info('Structured PR registers processed:',result.imported,'of',result.registered,
      'repositories;',result.fromRepository,'live files;',result.fromSnapshot,'bundled snapshots;',
      result.prObservations,'new PR observations;',result.failed,'failures');
    for(const problem of result.errors)console.warn('Source plan import incomplete:',
      problem.repo,problem.error);
  } catch {
    console.error('Source plan refresh failed; existing documented work preserved.');
  } finally {plansBusy=false;}
}
const plansTimer=setInterval(plans,5*60*1000);
const inboxTimer=setInterval(inbox,2000);
const syncTimer=setInterval(sync,60000);
// A deployment must not start with the previous container's stale PR counts.
// Force one bounded, PR-only GitHub reconciliation, then import current plan files.
void inbox();
const hasAuth=!!(process.env.GITHUB_READ_TOKEN||process.env.GITHUB_APP_ID&&process.env.GITHUB_INSTALLATION_ID);
void (async()=>{
  try{
    // HTTP codes only; no token, identities or response bodies in logs.
    console.info('GitHub read access diagnostic',JSON.stringify(await probeGitHubAccess()));
  }catch{console.warn('GitHub read access diagnostic unavailable');}
  try{console.info('Owner-requested GitHub About initialization',await seedRepositoryAbout(pool));}
  catch{console.warn('GitHub About initialization unavailable; existing descriptions preserved.');}
  await sync(hasAuth);await plans();
})();
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{
  stopping=true;clearInterval(inboxTimer);clearInterval(syncTimer);clearInterval(plansTimer);
  // Exit safely even during a provider request. Row transactions roll back and leases expire after restart.
  await pool.end();process.exit(0);
});

