import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
const OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const SESSION_COOKIE = process.env.ENGINE_ROOM_TEST_SERVER === "1" ? "engine_room_session" : (process.env.NODE_ENV === "production" ? "__Host-engine-room-session" : "engine_room_session");
export const SESSION_AGE_SECONDS = 12 * 60 * 60;
function derive(password:string,salt:Buffer):Promise<Buffer> {
 return new Promise((resolve,reject)=>scrypt(password,salt,64,OPTIONS,(error,out)=>error?reject(error):resolve(out)));
}
export function normalizeEmail(value:unknown):string|null {
 if(typeof value!=="string")return null;
 const email=value.trim().toLowerCase();
 return email.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null;
}
export function validPassword(value:unknown):value is string {
 return typeof value==="string" && value.length>=12 && value.length<=128;
}
export function createToken(){return randomBytes(32).toString("base64url");}
export function tokenDigest(value:string){return createHash("sha256").update(value).digest("hex");}
export async function hashPassword(value:string):Promise<string>{
 if(!validPassword(value))throw new Error("Password must be 12-128 characters");
 const salt=randomBytes(16);
 const hash=await derive(value,salt);
 return `scrypt-v1$${salt.toString("hex")}$${hash.toString("hex")}`;
}
export async function verifyPassword(value:string,encoded:string):Promise<boolean>{
 const bits=encoded.split("$");
 if(bits.length!==3 || bits[0]!=="scrypt-v1" || !/^[0-9a-f]{32}$/.test(bits[1]) || !/^[0-9a-f]{128}$/.test(bits[2]))return false;
 const a=await derive(value,Buffer.from(bits[1],"hex"));
 return timingSafeEqual(a,Buffer.from(bits[2],"hex"));
}
export function safeSecretCompare(value:string,secret:string):boolean{
 if(secret.length<32 || value.length>512)return false;
 return timingSafeEqual(Buffer.from(tokenDigest(value),"hex"),Buffer.from(tokenDigest(secret),"hex"));
}
