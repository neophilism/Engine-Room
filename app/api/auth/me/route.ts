import { NextRequest,NextResponse } from "next/server";
import { readSession } from "../../../../lib/auth/database";
import { SESSION_COOKIE } from "../../../../lib/auth/security";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const user=await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json(user?{user}:{error:"Unauthorized"},{status:user?200:401,headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Unavailable"},{status:503});}
}
