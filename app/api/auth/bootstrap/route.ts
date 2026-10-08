import { NextResponse } from "next/server";
import { getDatabasePool } from "../../../../lib/server/database";
import { issueSession } from "../../../../lib/auth/database";
import { sameOrigin, readJson, setSession } from "../../../../lib/auth/http";
import { hashPassword, normalizeEmail, safeSecretCompare, validPassword } from "../../../../lib/auth/security";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Invalid request origin"},{status:403});
 const data=await readJson(request);
 const email=normalizeEmail(data?.email),password=data?.password,displayName=data?.displayName,code=data?.bootstrapCode;
 const secret=process.env.ENGINE_ROOM_BOOTSTRAP_TOKEN||"";
 if(!email||!validPassword(password)||typeof displayName!=="string"||displayName.trim().length<1||displayName.length>120||typeof code!=="string")
  return NextResponse.json({error:"Invalid account details"},{status:400});
 if(!safeSecretCompare(code,secret))return NextResponse.json({error:"Bootstrap unavailable or invalid code"},{status:403});
 const client=await getDatabasePool().connect().catch(()=>null);
 if(!client)return NextResponse.json({error:"Account creation unavailable"},{status:503});
 try{
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('engine_room_first_admin'))");
  const existing=await client.query("SELECT 1 FROM engine_room_users WHERE role='admin' LIMIT 1");
  if(existing.rows.length){await client.query("ROLLBACK");return NextResponse.json({error:"Administrator already registered"},{status:403});}
  const encoded=await hashPassword(password);
  const user=await client.query<{id:string}>(
   "INSERT INTO engine_room_users(email,display_name,password_hash,role) VALUES($1,$2,$3,'admin') RETURNING id",
   [email,displayName.trim(),encoded]);
  const token=await issueSession(client,user.rows[0].id);
  await client.query("COMMIT");
  const response=NextResponse.json({ok:true},{status:201});
  setSession(response,token);
  return response;
 }catch{await client.query("ROLLBACK").catch(()=>undefined);return NextResponse.json({error:"Account creation failed"},{status:503});}
 finally{client.release();}
}
