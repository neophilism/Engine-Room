import { readSession } from '../auth/database';
import { SESSION_COOKIE } from '../auth/security';
import { authorizeAdmin } from './admin-auth';
export async function requestAdminActor(request:Request){
  if(authorizeAdmin(request.headers)==='authorized')return 'admin-token';
  const value=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(SESSION_COOKIE+'='))?.slice(SESSION_COOKIE.length+1);
  const user=await readSession(value);
  return user?.role==='admin'?'user:'+user.id:null;
}
export async function isRequestAdmin(request:Request){return !!await requestAdminActor(request);}
