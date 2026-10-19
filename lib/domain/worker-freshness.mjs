// A worker must pulse faster than the dashboard's loss-of-worker threshold.
// This is independent of provider polling and never changes manual refresh mode.
export const WORKER_HEARTBEAT_INTERVAL_MS=30000;
export const WORKER_STALE_AFTER_MS=90000;
export function workerHeartbeatFresh(value,now=Date.now()){
 if(!value)return false;
 const timestamp=new Date(value).getTime(),age=now-timestamp;
 return Number.isFinite(timestamp)&&age>=0&&age<WORKER_STALE_AFTER_MS;
}
