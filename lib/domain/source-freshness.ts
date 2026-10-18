/** One freshness policy for readouts, velocity and connection state. */
export function pollingMinutes(authenticated:boolean,configured=15){return Math.max(authenticated?15:120,configured);}
export function sourceFreshness(lastSuccessAt:string|null,error:string|null,now:number,intervalMinutes:number){
 if(error)return 'error' as const;
 if(!lastSuccessAt)return 'missing' as const;
 const time=Date.parse(lastSuccessAt),age=now-time;
 if(!Number.isFinite(time)||age < -120000)return 'invalid' as const;
 return age<(intervalMinutes+5)*60000?'current' as const:'stale' as const;
}
