import type { Pool, PoolClient } from 'pg';
export type CheckObservation = { id: string | number; head_sha: string; name: string; status: string; conclusion?: string | null; html_url?: string; observed_at: string | Date };
export function summarizeChecks(checks: readonly {status: string; conclusion?: string | null}[]): string;
export function bumpRevision(db: Pick<PoolClient,'query'>): Promise<void>;
export function persistPullRequest(db: Pick<PoolClient,'query'>, id: string, pr: Record<string,unknown>): Promise<boolean>;
export function persistChecks(db: Pick<PoolClient,'query'>, id: string, checks: CheckObservation[]): Promise<void>;
export function applyWebhook(db: Pick<PoolClient,'query'>, event: string, payload: unknown, receivedAt?: Date, env?: NodeJS.ProcessEnv): Promise<void>;
export function processWebhookInbox(pool: Pool, options?: {batch?: number; env?: NodeJS.ProcessEnv}): Promise<{processed:number;failed:number}>;
export function ensureRepository(db: Pick<PoolClient,'query'>, repo: unknown, env?: NodeJS.ProcessEnv): Promise<string|null>;
export function githubToken(env?: NodeJS.ProcessEnv, fetcher?: typeof fetch): Promise<string|undefined>;
export function githubRequester(db: Pick<PoolClient,'query'>, token?: string, env?: NodeJS.ProcessEnv, fetcher?: typeof fetch): (path: string)=>Promise<unknown>;
export class GitHubRateLimit extends Error {until:string;constructor(until:string);}
