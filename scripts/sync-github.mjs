import { Pool } from "pg";
import { reconcilePortfolio } from "../lib/sync/reconcile.mjs";
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is required");
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000});
try{console.info(await reconcilePortfolio(pool,{force:process.env.ENGINE_ROOM_SYNC_FORCE==="1"}));}
finally{await pool.end();}
