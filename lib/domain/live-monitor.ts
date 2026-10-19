import type {ImplementationReview} from './implementation-review';
export type LiveSnapshot={
  revision:string;state:'live'|'catching-up'|'stale'|'disconnected';checkedAt:string;
  oldestSyncAt:string|null;latestSyncAt:string|null;workerAt:string|null;
  repositories:number;unsynchronized:number;failedRepositories:number;pendingEvents:number;failedEvents:number;
  webhookConfigured:boolean;authenticatedGitHub:boolean;renderConfigured:boolean;pollingMinutes:number;
  openPrs:number;failedChecks:number;rateLimitResetAt:string|null;
  workerError?:string|null;reconciliationEnabled?:boolean;
};
export type PullRequestReadout={number:number;title:string;url:string;state:string;draft:boolean;headSha:string|null;baseRef:string|null;
  checks:string;checksAt:string|null;checksUrl:string|null;mergeable:boolean|null;updatedAt:string;mergedAt:string|null;releaseMerge:boolean|null;reviewSummary?:string|null};
export type ProjectActivitySummary={total:number;open:number;merged:number;drafts:number;failedChecks:number;runningChecks:number;lastObservedAt:string|null};
export type PlanItemReadout={implementationReview?:ImplementationReview;sourceItemId?:string;dependsOn?:string[];externalDependencies?:{repository:string;unitId:string}[];externalPrerequisites?:string[];sourceCommit?:string|null;ordinal:number;title:string;scope:'original'|'addition';numbers:number[];contributingNumbers?:number[];state:'merged'|'in-progress'|'unmapped'|'planned';reason:string|null;sourceUrl:string;repositoryUrl?:string};
export type SourcePlanSummary={original:number;originalComplete:number;added:number;addedComplete:number;unmapped:number;items:PlanItemReadout[];
  documents:{sourceCommit?:string|null;path:string;url:string;title:string;importedAt:string;versions:number}[]};
