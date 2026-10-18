import {createHash,randomUUID} from 'node:crypto';
export function reconciliationKey(env=process.env){
 const installation=Number(env.GITHUB_INSTALLATION_ID);
 return Number.isSafeInteger(installation)&&installation>0?installation:
  parseInt(createHash('sha256').update('owner:'+(env.ENGINE_ROOM_GITHUB_OWNER||'neophilism').toLowerCase()).digest('hex').slice(0,12),16)+1;
}
export function coverageStatus(result){
 return result.rateLimited||result.disabled||result.failed||result.deferred||result.discoveryIncomplete||
  result.repositories!==result.requested?'partial':'succeeded';
}
export async function startObservation(db,env){
 const id=randomUUID(),key=reconciliationKey(env);
 const claimed=await db.query(`INSERT INTO engine_room_reconciliation_runs(installation_id,status,last_started_at,last_finished_at,observation_id,coverage)
  VALUES($1,'running',now(),NULL,$2,'{}'::jsonb) ON CONFLICT(installation_id) DO UPDATE
  SET status='running',last_started_at=now(),last_finished_at=NULL,observation_id=$2,coverage='{}'::jsonb
  WHERE engine_room_reconciliation_runs.status<>'running' OR engine_room_reconciliation_runs.last_started_at<now()-interval '25 minutes'
  RETURNING observation_id`,[key,id]);
 return claimed.rowCount?{id,key}:null;
}
export async function finishObservation(db,run,result){
 const status=coverageStatus(result);
 // Counts use persisted rows, not cached snapshots shipped with the application.
 await db.query(`UPDATE engine_room_reconciliation_runs SET status=$3,last_finished_at=now(),coverage=$4::jsonb,
  published_at=CASE WHEN $3='succeeded' THEN now() ELSE published_at END,
  published_snapshot=CASE WHEN $3='succeeded' THEN
   (SELECT jsonb_agg(x) FROM (SELECT r.id,r.full_name,count(g.id)::integer AS total,
    count(g.id) FILTER(WHERE g.state='open')::integer AS open,
    count(g.id) FILTER(WHERE g.state='closed')::integer AS closed,
    count(g.id) FILTER(WHERE g.merged_at IS NOT NULL)::integer AS merged
    FROM repositories r LEFT JOIN github_pull_requests g ON g.repository_id=r.id WHERE NOT r.archived GROUP BY r.id) x)
   ELSE published_snapshot END
  WHERE installation_id=$1 AND observation_id=$2`,[run.key,run.id,status==='succeeded'?'succeeded':'failed',JSON.stringify({...result,status})]);
 return {...result,status,observationId:run.id};
}
