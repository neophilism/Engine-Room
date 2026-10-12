import type {Pool,PoolClient} from 'pg';
export function seedRepositoryAbout(db:Pick<Pool|PoolClient,'query'>,options?:{
 env?:NodeJS.ProcessEnv;fetcher?:(url:string,options:RequestInit)=>Promise<{ok:boolean;status:number;json:()=>Promise<unknown>}>;
 seed?:{scopeYear:number;olderExceptions:string[];entries:{repository:string;description:string}[]};
}):Promise<{updated:number;preserved:number;failed:number;disabled?:boolean}>;
