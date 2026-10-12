import type {PoolClient} from 'pg';
import type {RepositorySecurityStatus} from '../domain/security-status';
import {evaluateSecurityStatus,type SecurityStatusRecord} from '../sync/e2eesa-status.mjs';
export async function loadProjectSecurityStatuses(db:Pick<PoolClient,'query'>,projectId?:string){
 const result=await db.query<{project_id:string;full_name:string;default_branch:string;state:RepositorySecurityStatus['state']|null;status_json:SecurityStatusRecord|null;source_fingerprint:string|null;source_url:string|null;last_attempt_at:Date|string|null}>(
 "SELECT pr.project_id,r.full_name,r.default_branch,s.* FROM repositories r JOIN project_repositories pr ON pr.repository_id=r.id LEFT JOIN repository_security_status s ON s.repository_id=r.id WHERE ($1::uuid IS NULL OR pr.project_id=$1) ORDER BY pr.project_id,r.full_name",[projectId||null]);
 const grouped=new Map<string,RepositorySecurityStatus[]>();
 for(const row of result.rows){
 const state=row.state||'missing';
 let flags;try{flags=evaluateSecurityStatus(row.status_json,{state,fingerprint:row.source_fingerprint,paths:row.status_json?.observedSourcePaths||[]});}catch{flags=evaluateSecurityStatus(null,{state:'invalid'});}
 const item:RepositorySecurityStatus={...flags,repository:row.full_name,state,sourceUrl:row.source_url||'https://github.com/'+row.full_name+'/blob/'+row.default_branch+'/security/e2eesa-status.json',observedAt:row.last_attempt_at?new Date(row.last_attempt_at).toISOString():null};
 const current=grouped.get(row.project_id)||[];current.push(item);grouped.set(row.project_id,current);
 }return grouped;
}
