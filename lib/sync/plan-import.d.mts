import type { PoolClient } from 'pg';
export type ImportedPlanItem={ordinal:number;title:string;sourceItemId?:string;numbers:number[];reason:string|null;scope:string;contributions?:number[];dependsOn?:string[];externalDependencies?:{repository:string;unitId:string}[];externalPrerequisites?:string[];metadata?:Record<string,unknown>};
export function normalizedWorkTitle(title:string):string;
export function parseApprovedManifestItems(body:string,repoName:string,mappingBody?:string|null):ImportedPlanItem[];
export function parsePlanItems(body:string,path:string,repoName:string,prs?:{number:number;title:string}[],mappingBody?:string|null):ImportedPlanItem[];
export function persistPlanDocument(db:Pick<PoolClient,'query'>,repo:{id:string;full_name:string},document:{path:string;body:string;ref:string;items:ImportedPlanItem[];sourceUrl?:string;title?:string;sourceCommit?:string}):Promise<number>;
