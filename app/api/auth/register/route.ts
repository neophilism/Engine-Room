import { NextResponse } from "next/server";
import { getDatabasePool } from "../../../../lib/server/database";
import { issueSession } from "../../../../lib/auth/database";
import { readJson, sameOrigin, setSession } from "../../../../lib/auth/http";
import { hashPassword, tokenDigest, validPassword } from "../../../../lib/auth/security";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Invalid request origin"},{status:403});
 const data=await readJson(request),code=data?.invite,password=data?.password,name=data?.displayName;
 if(typeof code!=="string"||code.length<30||code.length>256||!validPassword(password)||
    typeof name!=="string"||name.trim().length<1||name.length>120)
  return NextResponse.json({error:"Invalid invitation or account details"},{status:400});
 const client=await getDatabasePool().connect().catch(()=>null);
 if(!client)return NextResponse.json({error:"Registration unavailable"},{status:503});
 try{
  await client.query("BEGIN");
  const result=await client.query<{email:string;role:"admin"|"viewer"}>(
   `SELECT email,role FROM engine_room_invitations WHERE token_hash=$1
    AND expires_at>now() AND consumed_at IS NULL FOR UPDATE`,[tokenDigest(code)]);
  const invite=result.rows[0];
  if(!invite){await client.query("ROLLBACK");return NextResponse.json({error:"Invitation invalid or expired"},{status:403});}
  const encoded=await hashPassword(password);
  const created=await client.query<{id:string}>(
   "INSERT INTO engine_room_users(email,display_name,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id",
   [invite.email,name.trim(),encoded,invite.role]);
  await client.query("UPDATE engine_room_invitations SET consumed_at=now() WHERE token_hash=$1",[tokenDigest(code)]);
  const token=await issueSession(client,created.rows[0].id);
  await client.query("COMMIT");
  const response=NextResponse.json({ok:true},{status:201});setSession(response,token);return response;
 }catch{await client.query("ROLLBACK").catch(()=>undefined);return NextResponse.json({error:"Registration unavailable or account exists"},{status:409});}
 finally{client.release();}
}
