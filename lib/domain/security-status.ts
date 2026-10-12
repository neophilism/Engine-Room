import type {SecurityEvaluation} from '../sync/e2eesa-status.mjs';
export type RepositorySecurityStatus=SecurityEvaluation&{repository:string;state:'valid'|'missing'|'invalid'|'unavailable'|'excluded';sourceUrl:string;observedAt:string|null};
