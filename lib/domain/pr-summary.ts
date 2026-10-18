/** GitHub counts are observations, never an estimate of application completion. */
export type PullRequestSummary = {
  total: number; open: number; closed: number; merged: number; closedWithoutMerge: number; drafts: number;
  observedAt: string | null;
};
export function normalizePrSummary(row: Record<string, unknown>): PullRequestSummary {
  const keys = ['total','open','closed','merged','closedWithoutMerge','drafts'] as const;
  const counts = Object.fromEntries(keys.map(key=>[key, Number(row[key])])) as Pick<PullRequestSummary, typeof keys[number]>;
  if (keys.some(key=>!Number.isSafeInteger(counts[key]) || counts[key]<0) ||
      counts.total!==counts.open+counts.closed || counts.closed!==counts.merged+counts.closedWithoutMerge || counts.drafts>counts.open) {
    throw new Error('Invalid GitHub PR count observation');
  }
  return {...counts,observedAt:typeof row.observedAt==='string'?row.observedAt:null};
}
