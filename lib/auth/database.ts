import type { PoolClient } from "pg";
import { getDatabasePool } from "../server/database";
import { createToken, SESSION_AGE_SECONDS, tokenDigest } from "./security";

export type EngineUser = { id:string; email:string; displayName:string; role:"admin"|"viewer" };
export async function issueSession(client:PoolClient,userId:string):Promise<string>{
 const token=createToken();
 await client.query(
  "INSERT INTO engine_room_auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+($3::int * interval '1 second'))",
  [tokenDigest(token),userId,SESSION_AGE_SECONDS]);
 return token;
}
export async function readSession(token:string|undefined):Promise<EngineUser|null>{
 if(!token || token.length>256 || !/^[\w-]{30,256}$/.test(token))return null;
 const r=await getDatabasePool().query<{id:string;email:string;display_name:string;role:"admin"|"viewer"}>(
  `SELECT u.id,u.email,u.display_name,u.role FROM engine_room_auth_sessions s
   JOIN engine_room_users u ON u.id=s.user_id
   WHERE s.token_hash=$1 AND s.expires_at>now() AND u.disabled=false LIMIT 1`,
  [tokenDigest(token)]
 );
 const user=r.rows[0];
 return user?{id:user.id,email:user.email,displayName:user.display_name,role:user.role}:null;
}
