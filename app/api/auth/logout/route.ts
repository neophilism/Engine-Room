import { NextRequest,NextResponse } from "next/server";
import { getDatabasePool } from "../../../../lib/server/database";
import { clearSession,sameOrigin } from "../../../../lib/auth/http";
import { SESSION_COOKIE,tokenDigest } from "../../../../lib/auth/security";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:"Invalid request origin"},{status:403});
 const token=request.cookies.get(SESSION_COOKIE)?.value;
 try{if(token)await getDatabasePool().query("DELETE FROM engine_room_auth_sessions WHERE token_hash=$1",[tokenDigest(token)]);}
 catch{return NextResponse.json({error:"Sign-out temporarily unavailable"},{status:503});}
 const response=NextResponse.json({ok:true});clearSession(response);return response;
}
