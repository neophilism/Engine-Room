import type { PlanItemReadout } from "./live-monitor";
import type { PlannedPullRequest } from "./portfolio";

/** Evidence is derived from real, repository-scoped GitHub PR observations. */
export type RepositoryHistory = {
  id: string;
  url: string;
  createdAt: string | null;
  syncedAt: string | null;
  pullRequests: { number: number; openedAt: string; mergedAt: string | null }[];
};

export type CompletedWorkCycle = {
  key: string;
  repositoryId: string;
  openedAt: string;
  mergedAt: string;
};

export type CompletionForecast = {
  /** As-of date is captured once per database snapshot, not invented by the browser. */
  asOf: string;
  calendarMs: number | null;
  prCycleMs: number | null;
  sampleCount: number;
  startAt: string | null;
  startBasis: "repository-created" | "first-observed-pr" | null;
  sourceObservedAt: string | null;
  sourceState: "fresh" | "stale" | "unknown";
};

const HOUR = 60 * 60 * 1000;
const MAX_FORECAST = 50 * 365.25 * 24 * HOUR;
export const RECENT_CYCLE_LIMIT = 12;
export const FRESHNESS_LIMIT_MS = 48 * HOUR;

function timestamp(iso: string | null | undefined): number | null {
  if (!iso || typeof iso !== "string") return null;
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : null;
}

function urlKey(value: string): string {
  return value.replace(/\/+$/, "").toLowerCase();
}

/**
 * One work cycle per accepted plan unit, not per arbitrary GitHub PR.
 * If a package requires several PRs, the cycle spans first open to final merge.
 * A partial contribution cannot make an unaccepted package appear complete.
 */
export function collectCompletedWorkCycles(
  repositories: readonly RepositoryHistory[],
  planItems: readonly PlanItemReadout[] = [],
  legacyUnits: readonly PlannedPullRequest[] = []
): CompletedWorkCycle[] {
  const byId = new Map(repositories.map(repo => [repo.id, repo]));
  const byUrl = new Map(repositories.map(repo => [urlKey(repo.url), repo]));
  const records: CompletedWorkCycle[] = [];
  const seen = new Set<string>();

  function add(key: string, repository: RepositoryHistory | undefined, numbers: readonly number[]) {
    if (!repository || !numbers.length || seen.has(key)) return;
    const prs = new Map(repository.pullRequests.map(pr => [pr.number, pr]));
    const matched = numbers.map(number => prs.get(number));
    if (matched.some(pr => !pr || !pr.mergedAt)) return;
    const opens = matched.map(pr => timestamp(pr?.openedAt)).filter((n): n is number => n !== null);
    const merges = matched.map(pr => timestamp(pr?.mergedAt)).filter((n): n is number => n !== null);
    if (opens.length !== numbers.length || merges.length !== numbers.length) return;
    const first = Math.min(...opens);
    const last = Math.max(...merges);
    if (first >= last || matched.some(pr => {
      const opened = timestamp(pr?.openedAt), merged = timestamp(pr?.mergedAt);
      return opened === null || merged === null || opened >= merged;
    })) return;
    seen.add(key);
    records.push({ key, repositoryId: repository.id, openedAt: new Date(first).toISOString(), mergedAt: new Date(last).toISOString() });
  }

  if (planItems.length) {
    for (const unit of planItems) {
      if (unit.state !== "merged") continue;
      const repo = unit.repositoryUrl ? byUrl.get(urlKey(unit.repositoryUrl)) : undefined;
      add(String(repo?.id) + ":" + unit.scope + ":" + unit.ordinal, repo, unit.numbers);
    }
  } else {
    for (const unit of legacyUnits) {
      if (unit.status !== "merged" || !unit.repositoryId || !unit.githubPrNumber) continue;
      add("legacy:" + unit.id, byId.get(unit.repositoryId), [unit.githubPrNumber]);
    }
  }

  return records;
}

function startEvidence(repositories: readonly RepositoryHistory[], asOf: number) {
  const creation = repositories.map(repo => timestamp(repo.createdAt))
    .filter((n): n is number => n !== null && n <= asOf);
  if (creation.length) return { ms: Math.min(...creation), basis: "repository-created" as const };
  const earliestPr = repositories.flatMap(repo => repo.pullRequests.map(pr => timestamp(pr.openedAt)))
    .filter((n): n is number => n !== null && n <= asOf);
  return earliestPr.length
    ? { ms: Math.min(...earliestPr), basis: "first-observed-pr" as const }
    : null;
}

/** Overlapping PR cycles run concurrently; idle gaps between cycles do not count. */
export function activeCycleUnionMs(cycles: readonly CompletedWorkCycle[]): number {
  const ranges = cycles.map(cycle => [timestamp(cycle.openedAt), timestamp(cycle.mergedAt)] as const)
    .filter((range): range is readonly [number, number] =>
      range[0] !== null && range[1] !== null && range[0] < range[1])
    .sort((a, b) => a[0] - b[0]);
  let duration = 0, from = 0, to = 0;
  for (const [open, merged] of ranges) {
    if (!to) { from = open; to = merged; continue; }
    if (open <= to) to = Math.max(to, merged);
    else { duration += to - from; from = open; to = merged; }
  }
  return duration + (to ? to - from : 0);
}

/**
 * Calendar pace = elapsed wall time since sourced project start / accepted units.
 * PR pace = union of active open-to-merge cycles for the most recent twelve
 * accepted units / number of those units. Parallel work shortens that union;
 * gaps between PR cycles are excluded. Neither is a scheduling guarantee.
 */
export function estimateCompletion(input: {
  planned: number;
  completed: number;
  repositories: readonly RepositoryHistory[];
  cycles: readonly CompletedWorkCycle[];
  asOf: string;
}): CompletionForecast | null {
  const { planned, completed, repositories, cycles, asOf } = input;
  const now = timestamp(asOf);
  if (!Number.isSafeInteger(planned) || planned < 1 ||
      !Number.isSafeInteger(completed) || completed < 0 || completed > planned ||
      now === null) return null;

  const start = startEvidence(repositories, now);
  const synced = repositories.map(repo => timestamp(repo.syncedAt));
  const everySynced = repositories.length > 0 && synced.every(t => t !== null && t <= now);
  const oldestSync = everySynced ? Math.min(...synced as number[]) : null;
  const sourceState: CompletionForecast["sourceState"] = oldestSync === null ? "unknown" :
    now - oldestSync > FRESHNESS_LIMIT_MS ? "stale" : "fresh";
  const remaining = planned - completed;

  const valid = cycles.filter(cycle => {
    const open = timestamp(cycle.openedAt), merged = timestamp(cycle.mergedAt);
    return open !== null && merged !== null && open < merged && merged <= now;
  }).sort((a, b) => Date.parse(b.mergedAt) - Date.parse(a.mergedAt));
  const samples = valid.slice(0, RECENT_CYCLE_LIMIT);
  const cycleDuration = activeCycleUnionMs(samples);
  const duration = (value: number): number | null =>
    Number.isFinite(value) && value > 0 && value <= MAX_FORECAST ? Math.ceil(value) : null;

  return {
    asOf,
    calendarMs: remaining === 0 ? 0 :
      completed > 0 && start && now > start.ms ? duration((now - start.ms) / completed * remaining) : null,
    prCycleMs: remaining === 0 ? 0 :
      samples.length && cycleDuration > 0 ? duration(cycleDuration / samples.length * remaining) : null,
    sampleCount: samples.length,
    startAt: start ? new Date(start.ms).toISOString() : null,
    startBasis: start?.basis ?? null,
    sourceObservedAt: oldestSync === null ? null : new Date(oldestSync).toISOString(),
    sourceState
  };
}

export function formatCompletionDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "Insufficient data";
  if (ms === 0) return "0d";
  const hours = ms / HOUR;
  if (hours < 48) return "≈ " + Math.max(1, Math.ceil(hours)) + "h";
  const days = hours / 24;
  if (days < 14) return "≈ " + (Math.round(days * 10) / 10) + "d";
  if (days < 120) return "≈ " + (Math.round(days / 7 * 10) / 10) + "w";
  if (days < 730) return "≈ " + (Math.round(days / 30.4375 * 10) / 10) + "mo";
  return "≈ " + (Math.round(days / 365.25 * 10) / 10) + "y";
}
