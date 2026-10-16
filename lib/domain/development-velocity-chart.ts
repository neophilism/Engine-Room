import type { VelocityProject, VelocityStatistics } from "./development-velocity";

const DAY_MS = 86_400_000;
export type ChartRange = 14 | 30 | 90 | 365;
export type VelocityMeasure = "rate" | "cumulative";
export type VelocityBucket = {
  from: string;
  to: string;
  merges: number;
  value: number;
  partial: boolean;
};

export function dayOrdinal(day: string): number {
  const number = Date.parse(day + "T00:00:00.000Z");
  if (!Number.isFinite(number) || new Date(number).toISOString().slice(0, 10) !== day) {
    throw new Error("Expected an ISO UTC date.");
  }
  return Math.floor(number / DAY_MS);
}
export function dayAt(ordinal: number): string {
  return new Date(ordinal * DAY_MS).toISOString().slice(0, 10);
}
export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
export function mergedByDay(projects: readonly VelocityProject[], selectedId = "portfolio"): Map<string, number> {
  const dayCounts = new Map<string, number>();
  for (const project of projects) {
    if (selectedId !== "portfolio" && project.id !== selectedId) continue;
    for (const row of project.days) {
      dayCounts.set(row.day, (dayCounts.get(row.day) || 0) + row.merges);
    }
  }
  return dayCounts;
}
function between(dayCounts: ReadonlyMap<string, number>, first: number, last: number) {
  let sum = 0;
  for (let d = first; d <= last; d++) sum += dayCounts.get(dayAt(d)) || 0;
  return sum;
}

/** Completed UTC days only; "today" is excluded from week-over-week velocity. */
export function velocityStats(
  projects: readonly VelocityProject[],
  selectedId = "portfolio",
  today: string = utcToday()
): VelocityStatistics {
  const end = dayOrdinal(today);
  const counts = mergedByDay(projects, selectedId);
  const last7 = between(counts, end - 7, end - 1);
  const previous7 = between(counts, end - 14, end - 8);
  return {
    last7,
    previous7,
    last28: between(counts, end - 28, end - 1),
    changePercent: previous7 > 0 ? Math.round((last7 / previous7 - 1) * 100) : null
  };
}

export function velocityBuckets(
  projects: readonly VelocityProject[],
  selectedId: string,
  range: ChartRange,
  measure: VelocityMeasure,
  today: string = utcToday()
): VelocityBucket[] {
  const end = dayOrdinal(today);
  const start = end - range + 1;
  const counts = mergedByDay(projects, selectedId);
  const width = range > 30 ? 7 : 1;
  const result: VelocityBucket[] = [];
  let cumulative = 0;
  for (let cursor = start; cursor <= end; cursor += width) {
    const last = Math.min(end, cursor + width - 1);
    const merges = between(counts, cursor, last);
    cumulative += merges;
    result.push({
      from: dayAt(cursor),
      to: dayAt(last),
      merges,
      value: measure === "rate" ? merges : cumulative,
      partial: last === end || last - cursor + 1 !== width
    });
  }
  return result;
}
/** Lifetime merged-PR rate. The portfolio is one continuous time span from
 * the earliest primary repository; NEVER sum or average per-project rates. */
export type LifetimePrRate = {
  mergedPrs: number;
  startedOn: string | null;
  calendarDays: number | null;
  prsPerDay: number | null;
};
export function lifetimePrRate(
  projects: readonly VelocityProject[],
  selectedId = "portfolio",
  today: string = utcToday()
): LifetimePrRate {
  const selected = selectedId === "portfolio"
    ? projects : projects.filter(project => project.id === selectedId);
  const mergedPrs = selected.reduce((sum, project) => sum + project.lifetime.mergedPrs, 0);
  const startedOn = selected.reduce<string | null>((earliest, project) => {
    const start = project.lifetime.startedOn;
    return start && (!earliest || start < earliest) ? start : earliest;
  }, null);
  // Do not produce a reassuring zero, nor an exaggerated rate, when a
  // repository's true inception date has not been observed.
  if (selected.length === 0 || !startedOn ||
      selected.some(project => project.lifetime.undatedRepositories > 0 ||
        project.lifetime.startedOn === null)) {
    return {mergedPrs, startedOn, calendarDays: null, prsPerDay: null};
  }
  const elapsed = dayOrdinal(today) - dayOrdinal(startedOn) + 1;
  if (elapsed < 1) return {mergedPrs, startedOn, calendarDays: null, prsPerDay: null};
  // Inclusive calendar days (in UTC), including the start date and today.
  // Today can be partial, just as the stored lifetime merged count can be.
  const calendarDays = Math.max(1, elapsed);
  return {mergedPrs, startedOn, calendarDays, prsPerDay: mergedPrs / calendarDays};
}

export type BoardroomImpact = {
  before: number;
  after: number;
  percent: number | null;
  multiplier: number | null;
};
/**
 * Matched seven full UTC days before and after launch; exclude launch date.
 * A full seven post-launch days must elapse before returning a comparison.
 */
export function boardroomImpact(
  projects: readonly VelocityProject[],
  selectedId: string,
  startDate: string | null,
  today: string = utcToday()
): BoardroomImpact | null {
  if (!startDate) return null;
  const start = dayOrdinal(startDate);
  const end = dayOrdinal(today);
  if (end < start + 8 || start - 7 < end - 364) return null;
  const counts = mergedByDay(projects, selectedId);
  const before = between(counts, start - 7, start - 1);
  const after = between(counts, start + 1, start + 7);
  return {
    before, after,
    percent: before > 0 ? Math.round((after / before - 1) * 100) : null,
    multiplier: before > 0 ? Math.round(after / before * 100) / 100 : null
  };
}
