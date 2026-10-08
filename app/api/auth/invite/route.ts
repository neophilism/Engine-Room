import { NextRequest, NextResponse } from "next/server";
import { getDatabasePool } from "../../../../lib/server/database";
import { readSession } from "../../../../lib/auth/database";
import { sameOrigin, readJson } from "../../../../lib/auth/http";
import { createToken, normalizeEmail, SESSION_COOKIE, tokenDigest } from "../../../../lib/auth/security";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:"Invalid request origin"},{status:403});
 const data=await readJson(request),email=normalizeEmail(data?.email);
 const role=data?.role==="admin"?"admin":"viewer";
 if(!email)return NextResponse.json({error:"Invalid email"},{status:400});
 let user;
 try{user=await readSession(request.cookies.get(SESSION_COOKIE)?.value);}
 catch{return NextResponse.json({error:"Account store unavailable"},{status:503});}
 if(!user||user.role!=="admin")return NextResponse.json({error:"Administrator required"},{status:403});
 const token=createToken();
 try{
  await getDatabasePool().query(
   `INSERT INTO engine_room_invitations(token_hash,email,role,invited_by,expires_at)
    VALUES($1,$2,$3,$4,now()+interval '7 days')`,
   [tokenDigest(token),email,role,user.id]);
  const url=new URL("/register",process.env.ENGINE_ROOM_BASE_URL||request.url);
  url.searchParams.set("invite",token);
  return NextResponse.json({inviteUrl:url.toString(),email,role,expiresInDays:7},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Invitation creation failed"},{status:503});}
}
