import {Pool} from 'pg';
import {reconcilePlanSources} from '../lib/sync/plan-source-sync.mjs';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:4});
try {
  const result=await reconcilePlanSources(pool);
  console.info(JSON.stringify(result));
  if(result.failed)process.exitCode=1;
} finally {await pool.end();}
