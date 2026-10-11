import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readSession } from "./lib/auth/database";
import { SESSION_COOKIE } from "./lib/auth/security";
import { authorizeAdmin } from './lib/server/admin-auth';

// Next 15.5 stable Node runtime permits a durable DB lookup on every request.
// Disabled accounts and revoked sessions take effect immediately.
export const config={
 runtime:"nodejs",
 matcher:["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
const pages=new Set(["/login","/setup","/register"]);
const adminOnly=["/finance","/users","/operations","/releases","/alerts","/settings","/api/admin","/api/public-github-status"];
const apis=new Set(["/api/health","/api/ready","/api/auth/login","/api/auth/bootstrap","/api/auth/register","/api/github/webhook","/api/telemetry"]);
export async function middleware(request:NextRequest){
 const path=request.nextUrl.pathname;
 if(path==='/api/admin/reconcile' && authorizeAdmin(request.headers)==='authorized')return NextResponse.next();
 if(pages.has(path)||apis.has(path)){
  const res=NextResponse.next();
  res.headers.set("Cache-Control","private, no-store");
  res.headers.set("X-Robots-Tag","noindex, nofollow");
  return res;
 }
 let user=null;
 try{user=await readSession(request.cookies.get(SESSION_COOKIE)?.value);}
 catch{/* Database or configuration unavailable: reject request. */}
 if(!user){
  if(path.startsWith("/api/"))return NextResponse.json({error:"Authentication required"},{status:401,headers:{"Cache-Control":"no-store"}});
  const url=new URL("/login",request.url);
  url.searchParams.set("next",path+request.nextUrl.search);
  return NextResponse.redirect(url);
 }
 if(user.role!=="admin" && adminOnly.some(prefix=>path===prefix||path.startsWith(prefix+"/"))){
  if(path.startsWith("/api/"))return NextResponse.json({error:"Administrator required"},{status:403});
  return NextResponse.redirect(new URL("/account",request.url));
 }
 const res=NextResponse.next();
 res.headers.set("Cache-Control","private, no-store");
 res.headers.set("X-Robots-Tag","noindex, nofollow");
 res.headers.set("X-Frame-Options","DENY");
 res.headers.set("Referrer-Policy","no-referrer");
 return res;
}
