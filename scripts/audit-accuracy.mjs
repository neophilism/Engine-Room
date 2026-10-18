import {Pool} from 'pg';
import {githubToken} from '../lib/sync/github-runtime.mjs';
import {auditPortfolioAccuracy} from '../lib/sync/accuracy-audit.mjs';
if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL for the existing Engine Room database; never print its value');
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:10000});
try{
 const token=await githubToken();
 const get=async path=>{
  const r=await fetch('https://api.github.com'+path,{headers:{Accept:'application/vnd.github+json','User-Agent':'Engine-Room-Accuracy-Audit',...(token?{Authorization:'Bearer '+token}:{})},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error('GitHub observation unavailable');return r.json();
 };
 console.log(JSON.stringify(await auditPortfolioAccuracy(pool,{get,owner:process.env.ENGINE_ROOM_GITHUB_OWNER||'neophilism'}),null,2));
}finally{await pool.end();}
