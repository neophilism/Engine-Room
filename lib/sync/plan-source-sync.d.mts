import type {Pool} from 'pg';
export type PlanSourceImportReport={
  registered:number;withDocumentedSource:number;imported:number;failed:number;
  fromRepository:number;fromSnapshot:number;prObservations:number;
  completed:Array<{repo:string;origin:"repository"|"bundled";units:number;autoLinked?:number;prObservations:number;observedAt:string}>;
  errors:Array<{repo:string;error:string}>;
};
export function reconcilePlanSources(pool:Pool,options?:{
  fetcher?:typeof fetch;owner?:string;repositoryLimit?:number;concurrency?:number;
  readSnapshot?:(name:string)=>Promise<string>;
}):Promise<PlanSourceImportReport>;
