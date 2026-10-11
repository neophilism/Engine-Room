export declare const STRUCTURED_PR_PATH: "registry/prs.json";
export declare const PR_SNAPSHOT_DIRECTORY: "registry/pr-snapshots";
export type StructuredPrRecord = {
  id:number;number:number;title:string;url:string;state:"open"|"closed";draft:boolean;
  createdAt:string;updatedAt:string;closedAt:string|null;mergedAt:string|null;
  headSha?:string|null;baseRef?:string|null;mergeCommitSha?:string|null;
};
export type StructuredPrUnit = {id:string;title:string;origin:"original"|"addition"|"added";prs:number[]};
export type StructuredPrDocument = {
  schemaVersion:1;repository:string;roadmapVersion:number;planVerified:boolean;
  plannedPrCount:number;observedAt:string;units:StructuredPrUnit[];pullRequests:StructuredPrRecord[];
};
export declare function parseStructuredPrRegistry(body:string,repositoryName:string): {
  document:StructuredPrDocument;
  items:{ordinal:number;sourceItemId:string;title:string;scope:"original"|"addition";numbers:number[];reason:string|null}[];
  pullRequests:StructuredPrRecord[];
};
export declare function snapshotPrToGitHub(record:StructuredPrRecord): {
  id:number;number:number;title:string;state:"open"|"closed";draft:boolean;html_url:string;
  created_at:string;updated_at:string;closed_at:string|null;merged_at:string|null;
  head?:{sha:string};base?:{ref:string};merge_commit_sha:string|null;
};
