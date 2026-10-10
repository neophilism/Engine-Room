import { Pool } from 'pg';
import { processWebhookInbox } from '../lib/sync/github-runtime.mjs';
import { reconcilePortfolio } from '../lib/sync/reconcile.mjs';
import { reconcilePlanSources } from '../lib/sync/plan-source-sync.mjs';

const pool=new Pool({connectionString:process.env.DATABASE_URL||process.env.DATABASE_URL_UNPOOLED,max:3,connectionTimeoutMillis:10000});
let stopping=false,inboxBusy=false,syncBusy=false,plansBusy=false;
async function inbox(){
  if(stopping||inboxBusy)return;
  inboxBusy=true;
  try{await processWebhookInbox(pool);await pool.query('UPDATE engine_room_live_state SET last_worker_at=now() WHERE singleton=true');}
  catch{console.error('Webhook worker unavailable; durable inbox preserved.');}
  finally{inboxBusy=false;}
}
async function sync(){
  if(stopping||syncBusy)return;
  syncBusy=true;
  try{console.info('Portfolio reconciliation',await reconcilePortfolio(pool));}
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
    console.info('Source plans refreshed:',result.imported,'of',result.withDocumentedSource,
      'documented repositories;',result.failed,'source failures');
    for(const problem of result.errors)console.warn('Source plan import incomplete:',
      problem.repo,problem.error);
  } catch {
    console.error('Source plan refresh failed; existing documented work preserved.');
  } finally {plansBusy=false;}
}
const plansTimer=setInterval(plans,5*60*1000);
const inboxTimer=setInterval(inbox,2000);
const syncTimer=setInterval(sync,60000);
void inbox();void plans();void sync();
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{
  stopping=true;clearInterval(inboxTimer);clearInterval(syncTimer);clearInterval(plansTimer);
  // Exit safely even during a provider request. Row transactions roll back and leases expire after restart.
  await pool.end();process.exit(0);
});
