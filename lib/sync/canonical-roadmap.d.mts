export const CANONICAL_ROADMAP_PATH: "registry/roadmap.json";
export type RoadmapDocument = {repository_id:string;repository_name:string;path:string};
export type CanonicalItem = {ordinal:number;sourceItemId:string;title:string;numbers:number[];scope:"original"|"addition";reason:string|null};
export function parseCanonicalRoadmap(body:string,repoName:string):CanonicalItem[];
export function candidateRoadmapPaths(repoName:string,configured?:Record<string,string[]>):string[];
export function shouldImportPlanDocument(doc:RoadmapDocument,canonicalRepositoryIds:ReadonlySet<string>,configuredPaths:Record<string,string[]>):boolean;
