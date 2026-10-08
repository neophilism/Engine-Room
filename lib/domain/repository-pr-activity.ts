/**
 * Approved-plan counts remain a separate denominator from repository PR activity.
 * "Additional" means observed GitHub PRs NOT explicitly mapped to approved plan units.
 */
export type PullRequestCounts = {
  total: number;
  merged: number;
  open: number;
  closedUnmerged: number;
};
export type RepositoryPrActivity = PullRequestCounts & { lastObservedAt: string };

export type PortfolioPrActivityRow = {
  project_id: string;
  total_count: number | string;
  merged_count: number | string;
  open_count: number | string;
  closed_unmerged_count: number | string;
  additional_total_count: number | string;
  additional_merged_count: number | string;
  additional_open_count: number | string;
  additional_closed_unmerged_count: number | string;
  mapped_units: number | string;
  latest_observation: Date | string | null;
};

function count(raw: number | string): number {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("Invalid GitHub PR activity count.");
  return n;
}

function validateCounts(value: PullRequestCounts): PullRequestCounts {
  if (value.merged + value.open + value.closedUnmerged !== value.total) {
    throw new Error("GitHub PR activity states do not add up.");
  }
  return value;
}

export function classifyProjectPullRequests(row: PortfolioPrActivityRow, planned: number): {
  observed: RepositoryPrActivity;
  additional?: PullRequestCounts;
  mappingComplete: boolean;
} {
  const observed = validateCounts({
    total: count(row.total_count),
    merged: count(row.merged_count),
    open: count(row.open_count),
    closedUnmerged: count(row.closed_unmerged_count)
  });
  const additional = validateCounts({
    total: count(row.additional_total_count),
    merged: count(row.additional_merged_count),
    open: count(row.additional_open_count),
    closedUnmerged: count(row.additional_closed_unmerged_count)
  });
  if (additional.total > observed.total || additional.merged > observed.merged ||
      additional.open > observed.open || additional.closedUnmerged > observed.closedUnmerged) {
    throw new Error("Additional PRs cannot exceed all repository PRs.");
  }
  const mapped = count(row.mapped_units);
  const mappingComplete = planned > 0 && mapped === planned;
  if (!row.latest_observation) throw new Error("Observed PRs need a source timestamp.");
  const observedAt = new Date(row.latest_observation).toISOString();
  return {
    observed: { ...observed, lastObservedAt: observedAt },
    ...(mappingComplete ? { additional } : {}),
    mappingComplete
  };
}
