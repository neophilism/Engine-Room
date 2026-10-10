import type {Pool} from 'pg';
import {getDatabasePool} from './database';
export type DatabaseReadout={state:'observed'|'unconfigured'|'unavailable';checkedAt:string;database?:string;version?:string;sizeBytes?:number;probeMs?:number};
export async function loadDatabaseReadout(db?:Pick<Pool,'query'>):Promise<DatabaseReadout>{
  const checkedAt=new Date().toISOString();
  if(!db&&!process.env.DATABASE_URL)return {state:'unconfigured',checkedAt};
  const start=performance.now();
  try{
    const query={text:"SELECT current_database() AS name,current_setting('server_version') AS version,pg_database_size(current_database()) AS bytes",query_timeout:5000};
    const row=(await (db||getDatabasePool()).query<{name:string;version:string;bytes:string}>(query)).rows[0];
    return {state:'observed',checkedAt,database:row.name,version:row.version,sizeBytes:Number(row.bytes),probeMs:Math.round((performance.now()-start)*10)/10};
  }catch{return {state:'unavailable',checkedAt};}
}
