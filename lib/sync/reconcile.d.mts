import type { Pool } from 'pg';
export function reconcilePortfolio(pool:Pool,options?:{env?:NodeJS.ProcessEnv;fetcher?:typeof fetch;force?:boolean;repositoryLimit?:number}):Promise<{repositories:number;failed:number;disabled?:boolean;rateLimited?:boolean}>;
