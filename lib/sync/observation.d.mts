import type {Pool,PoolClient} from 'pg';
export function reconciliationKey(env?:Record<string,string|undefined>):number;
export function coverageStatus(result:Record<string,unknown>):'partial'|'succeeded';
export function startObservation(db:Pick<Pool|PoolClient,'query'>,env?:Record<string,string|undefined>):Promise<{id:string;key:number}|null>;
export function finishObservation(db:Pick<Pool|PoolClient,'query'>,run:{id:string;key:number},result:Record<string,unknown>):Promise<Record<string,unknown>>;
