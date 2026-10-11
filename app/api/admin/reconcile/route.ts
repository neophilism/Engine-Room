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
  // A genuine manual refresh checks every registered repository, rather than
  // the old fixed subset of 12. PRs are authoritative before plan ID mapping.
  let github:{repositories:number;failed:number;attempted?:number;optionalFailures?:number;
    failures?:{repo:string;reason:string}[];disabled?:boolean;rateLimited?:boolean;rateLimitResetAt?:string|null;error?:string};
  try{github=await reconcilePortfolio(pool,{force:mode==="manual",
    repositoryLimit:100,quick:mode==="manual",concurrency:mode==="manual"?5:2});}
  catch{github={repositories:0,failed:1,error:"GitHub PR synchronization unavailable; previous records retained"};}
  const plans=await reconcilePlanSources(pool);
  const snapshotNames=plans.completed.filter(item=>item.origin==="bundled").map(item=>item.repo);
  const status=github.disabled?"disabled":github.rateLimited?"rate-limited":
    github.failed||plans.failed||snapshotNames.length?"partial":"succeeded";
  return reply({status,...github,...inbox,structured:{
    imported:plans.imported,failed:plans.failed,registered:plans.registered,
    fromSnapshot:plans.fromSnapshot,fromRepository:plans.fromRepository,
    snapshotRepositories:snapshotNames,sourceErrors:plans.errors,
    inferredByExactId:plans.completed.reduce((sum,item)=>sum+(item.autoLinked||0),0),
    prObservations:plans.prObservations}});
 }catch{return reply({error:"Synchronization unavailable; previous records preserved"},503);}
}
