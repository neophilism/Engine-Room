import type {Pool,PoolClient} from 'pg';
export type DevelopmentUpdate = {kind:'pr-opened'|'pr-merged'|'pr-closed'|'pr-updated'|'pr-pushed'|'direct-commit'|'repository-push';at:string;title:string;url:string;ref:string};
export const UPDATE_KINDS: string[];
export function githubTimestamp(value:unknown):string|null;
export function latestDevelopmentUpdate(repo:Record<string,unknown>,prs:Record<string,unknown>[],commit?:Record<string,unknown>|null):DevelopmentUpdate|null;
export function persistLatestActivity(db:Pick<Pool|PoolClient,'query'>,repositoryId:string,update:DevelopmentUpdate|null):Promise<void>;
