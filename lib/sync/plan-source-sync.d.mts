import type { Pool } from 'pg';
export type PlanSourceImportReport = {
  registered: number;
  withDocumentedSource: number;
  imported: number;
  failed: number;
  completed: Array<{repo:string;plans:Array<{path:string;units:number}>}>;
  errors: Array<{repo:string;error:string}>;
};
export function reconcilePlanSources(pool:Pool,options?:{
  fetcher?: typeof fetch;
  owner?: string;
  repositoryLimit?: number;
  concurrency?: number;
}):Promise<PlanSourceImportReport>;
