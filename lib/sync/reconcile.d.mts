import type { Pool } from 'pg';
export function reconcilePortfolio(pool:Pool,options?:{
  env?:NodeJS.ProcessEnv;fetcher?:typeof fetch;force?:boolean;repositoryLimit?:number;
  quick?:boolean;concurrency?:number;
}):Promise<{repositories:number;failed:number;attempted?:number;optionalFailures?:number;metadataFailures?:number;activityFailures?:number;
  failures?:Array<{repo:string;reason:string}>;disabled?:boolean;rateLimited?:boolean;
  rateLimitResetAt?:string|null}>;

