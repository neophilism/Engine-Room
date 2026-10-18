import {NextResponse} from 'next/server';
import {isRequestAdmin} from '../../../../lib/server/request-admin';
import {getDatabasePool} from '../../../../lib/server/database';
import {githubToken} from '../../../../lib/sync/github-runtime.mjs';
import {auditPortfolioAccuracy} from '../../../../lib/sync/accuracy-audit.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=120;
export async function GET(request:Request){
 const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!await isRequestAdmin(request))return reply({error:'Administrator required'},403);
 try{
  const token=await githubToken(process.env,fetch);
  const get=async(path:string)=>{
   const response=await fetch('https://api.github.com'+path,{headers:{Accept:'application/vnd.github+json','User-Agent':'Engine-Room-Accuracy-Audit',...(token?{Authorization:'Bearer '+token}:{})},signal:AbortSignal.timeout(15000),cache:'no-store'});
   if(!response.ok)throw new Error('GitHub source unavailable');
   return response.json();
  };
  return reply(await auditPortfolioAccuracy(getDatabasePool(),{get,owner:process.env.ENGINE_ROOM_GITHUB_OWNER||'neophilism'}));
 }catch{return reply({error:'Accuracy audit unavailable; no project records changed'},503);}
}
