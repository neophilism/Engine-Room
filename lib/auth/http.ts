import type { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_AGE_SECONDS } from "./security";
export function sameOrigin(request:Request){
 const origin=request.headers.get("origin");
 try{return Boolean(origin && origin===new URL(process.env.ENGINE_ROOM_BASE_URL||request.url).origin);}
 catch{return false;}
}
export async function readJson(request:Request):Promise<Record<string,unknown>|null>{
 if(!request.headers.get("content-type")?.startsWith("application/json"))return null;
 const raw=await request.text();
 if(raw.length>8192)return null;
 try{const value:unknown=JSON.parse(raw);return value && typeof value==="object" && !Array.isArray(value)?value as Record<string,unknown>:null;}
 catch{return null;}
}
export function setSession(response:NextResponse,token:string){
 response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:SESSION_AGE_SECONDS});
 response.headers.set("Cache-Control","no-store");
}
export function clearSession(response:NextResponse){
 response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:0});
 response.headers.set("Cache-Control","no-store");
}
