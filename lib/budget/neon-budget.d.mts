export type BudgetStatus={status:'unconfigured'|'unavailable'|'paused'|'tracking';paused:boolean;spentUSD:number|null;thresholdUSD:number;limitUSD:number;computeUSD?:number;storageUSD?:number;lastObserved?:string|null;note?:string;method?:string;totalDataTransferBytes?:number;};
export declare const BUDGET_USD:number;
export declare const PAUSE_AT_USD:number;
export declare function estimateNeonUsage(response:unknown):BudgetStatus|null;
export declare function readNeonBudget(env?:NodeJS.ProcessEnv,fetcher?:typeof fetch):Promise<BudgetStatus>;
