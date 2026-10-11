import { NextResponse } from "next/server";
import { isRequestAdmin } from "../../../../lib/server/request-admin";
import { trustedWriteOrigin } from "../../../../lib/server/admin-auth";
import { getDatabasePool } from "../../../../lib/server/database";
import { reconcilePortfolio } from "../../../../lib/sync/reconcile.mjs";
import { reconcilePlanSources } from "../../../../lib/sync/plan-source-sync.mjs";
import { processWebhookInbox } from "../../../../lib/sync/github-runtime.mjs";
export const runtime="nodejs";
export const maxDuration=120;
export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
 if(!await isRequestAdmin(request))return reply({error:"Administrator required"},401);
 if(!trustedWriteOrigin(request))return reply({error:"Untrusted origin"},403);
 let mode:string;
 try{const raw=await request.text();if(raw.length>256)return reply({error:"Request too large"},413);
  const value=JSON.parse(raw);if(!value||Object.keys(value).join(",")!=="mode"||!["manual","scheduled"].includes(value.mode))throw new Error();mode=value.mode;
 }catch{return reply({error:"Choose manual or scheduled synchronization"},400);}
 try{const pool=getDatabasePool();const inbox=await processWebhookInbox(pool);
  // Structured records work even when private GitHub API access fails.
  const plans=await reconcilePlanSources(pool);
  let github:{repositories:number;failed:number;disabled?:boolean;rateLimited?:boolean;rateLimitResetAt?:string|null;error?:string};
  try{github=await reconcilePortfolio(pool,{force:mode==="manual",repositoryLimit:mode==="manual"?12:100});}
  catch{github={repositories:0,failed:1,error:"GitHub API unavailable; structured records retained"};}
  return reply({status:github.disabled?"disabled":github.rateLimited?"rate-limited":github.failed||plans.failed?"partial":"succeeded",
    ...github,...inbox,structured:{imported:plans.imported,failed:plans.failed,fromSnapshot:plans.fromSnapshot,
    fromRepository:plans.fromRepository,prObservations:plans.prObservations}});
 }catch{return reply({error:"Synchronization unavailable; previous records preserved"},503);}
}
