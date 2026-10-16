import type {PrDocument,PrItem,PrRecord} from '../../registry/pr-contract.mjs';
export {STRUCTURED_PR_PATH,PR_SNAPSHOT_DIRECTORY,attachObservedWorkIds} from '../../registry/pr-contract.mjs';
export type StructuredPrRecord=PrRecord;
export type StructuredPrDocument=PrDocument;
export declare function parseStructuredPrRegistry(body:string,repositoryName:string):{document:PrDocument;items:PrItem[];pullRequests:PrRecord[]};
export declare function snapshotPrToGitHub(record:StructuredPrRecord): {
  id:number;number:number;title:string;state:"open"|"closed";draft:boolean;html_url:string;
  created_at:string;updated_at:string;closed_at:string|null;merged_at:string|null;
  head?:{sha:string};base?:{ref:string};merge_commit_sha:string|null;
};

