import type { Pool } from 'pg';
export function reconcilePortfolio(pool:Pool,options?:{
  env?:NodeJS.ProcessEnv;fetcher?:typeof fetch;force?:boolean;repositoryLimit?:number;
  quick?:boolean;concurrency?:number;
}):Promise<{repositories:number;failed:number;requested?:number;deferred?:number;discoveryIncomplete?:boolean;observationId?:string;status?:string;attempted?:number;optionalFailures?:number;metadataFailures?:number;activityFailures?:number;securityFailures?:number;
  failures?:Array<{repo:string;reason:string}>;disabled?:boolean;rateLimited?:boolean;
  rateLimitResetAt?:string|null}>;

