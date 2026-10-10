import type { PoolClient } from 'pg';
export type ImportedPlanItem={ordinal:number;title:string;numbers:number[];reason:string|null;scope:string};
export function normalizedWorkTitle(title:string):string;
export function parseApprovedManifestItems(body:string,repoName:string,mappingBody?:string|null):ImportedPlanItem[];
export function parsePlanItems(body:string,path:string,repoName:string,prs?:{number:number;title:string}[],mappingBody?:string|null):ImportedPlanItem[];
export function persistPlanDocument(db:Pick<PoolClient,'query'>,repo:{id:string;full_name:string},document:{path:string;body:string;ref:string;items:ImportedPlanItem[];sourceUrl?:string;title?:string}):Promise<number>;
