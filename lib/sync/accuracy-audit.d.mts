import type {Pool,PoolClient} from 'pg';
export type PrFacts={total:number;open:number;closed:number;merged:number;closedWithoutMerge:number;drafts:number};
export function summarizeGitHubPulls(records:unknown):PrFacts;
export function fetchCompletePrFacts(get:(path:string)=>Promise<unknown>,repository:string):Promise<PrFacts>;
export function auditPortfolioAccuracy(db:Pick<Pool|PoolClient,'query'>,options:{get:(path:string)=>Promise<unknown>;owner?:string;concurrency?:number}):Promise<{scope:string;tracked:number;matched:number;different:number;unknown:number;note:string;repositories:unknown[]}>;
