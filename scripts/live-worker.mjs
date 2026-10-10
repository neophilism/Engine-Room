import { Pool } from 'pg';
import { processWebhookInbox } from '../lib/sync/github-runtime.mjs';
import { reconcilePortfolio } from '../lib/sync/reconcile.mjs';

const pool=new Pool({connectionString:process.env.DATABASE_URL||process.env.DATABASE_URL_UNPOOLED,max:3,connectionTimeoutMillis:10000});
let stopping=false,inboxBusy=false,syncBusy=false;
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
const inboxTimer=setInterval(inbox,2000);
const syncTimer=setInterval(sync,60000);
void inbox();void sync();
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{
  stopping=true;clearInterval(inboxTimer);clearInterval(syncTimer);
  // Exit safely even during a provider request. Row transactions roll back and leases expire after restart.
  await pool.end();process.exit(0);
});
