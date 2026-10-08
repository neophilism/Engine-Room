import { NextResponse } from "next/server";
import { getDatabasePool } from "../../../../lib/server/database";
import { issueSession } from "../../../../lib/auth/database";
import { sameOrigin, readJson, setSession } from "../../../../lib/auth/http";
import { normalizeEmail, verifyPassword } from "../../../../lib/auth/security";
export const runtime="nodejs";
const dummy="scrypt-v1$"+"0".repeat(32)+"$"+"0".repeat(128);
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Invalid request origin"},{status:403});
 const data=await readJson(request), email=normalizeEmail(data?.email), password=data?.password;
 if(!email||typeof password!=="string"||password.length>128)return NextResponse.json({error:"Invalid credentials"},{status:401});
 const client=await getDatabasePool().connect().catch(()=>null);
 if(!client)return NextResponse.json({error:"Sign-in unavailable"},{status:503});
 try{
  await client.query("BEGIN");
  const found=await client.query<{id:string;password_hash:string;disabled:boolean;failed_attempts:number;locked:boolean}>(
   `SELECT id,password_hash,disabled,failed_attempts,coalesce(locked_until>now(),false) AS locked
    FROM engine_room_users WHERE email=$1 FOR UPDATE`,[email]);
  const user=found.rows[0];
  const matches=await verifyPassword(password,user?.password_hash||dummy);
  if(!user||user.disabled||user.locked||!matches){
   if(user&&!user.locked){
    await client.query(`UPDATE engine_room_users SET failed_attempts=failed_attempts+1,
     locked_until=CASE WHEN failed_attempts+1>=5 THEN now()+interval '15 minutes' ELSE null END WHERE id=$1`,[user.id]);
   }
   await client.query("COMMIT");
   return NextResponse.json({error:"Invalid credentials or account temporarily locked"},{status:401,headers:{"Cache-Control":"no-store"}});
  }
  await client.query("UPDATE engine_room_users SET failed_attempts=0,locked_until=null WHERE id=$1",[user.id]);
  const token=await issueSession(client,user.id);
  await client.query("COMMIT");
  const response=NextResponse.json({ok:true});
  setSession(response,token);
  return response;
 }catch{
  await client.query("ROLLBACK").catch(()=>undefined);
  return NextResponse.json({error:"Sign-in temporarily unavailable"},{status:503});
 }finally{client.release();}
}
