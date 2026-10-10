import type { SourcePlanSummary } from "./live-monitor";

/**
 * A progress denominator is the ENTIRE published plan, not the number of
 * open PRs, closed PRs, discovered PRs, or currently mapped plan items.
 * Uncreated and unmapped planned items remain in the denominator.
 */
export type PlannedTrack = { planned: number; completed: number };
export type PlannedProgress = {
  original: PlannedTrack;
  added: PlannedTrack;
  planned: number;
  completed: number;
  remaining: number;
  percent: number;
};

export type PlanSource = {
  planned: number;
  completed: number;
  sourcePlan?: SourcePlanSummary;
};

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function summarizePlannedProgress(source: PlanSource): PlannedProgress | null {
  const published = source.sourcePlan;
  const hasApproved = validCount(source.planned) && source.planned > 0;
  const originalPlanned = hasApproved ? source.planned : published?.original ?? 0;
  const originalCompleted = hasApproved ? source.completed : published?.originalComplete ?? 0;

  // Do not combine contradictory approved and source-document baselines.
  // Additions may be tracked only when an original document baseline exists.
  const matchingSource = !!published && published.original > 0 &&
    (!hasApproved || published.original === originalPlanned);
  const addedPlanned = matchingSource ? published.added : 0;
  const addedCompleted = matchingSource ? published.addedComplete : 0;

  if (![originalPlanned, originalCompleted, addedPlanned, addedCompleted].every(validCount) ||
    originalCompleted > originalPlanned || addedCompleted > addedPlanned) {
    return null;
  }

  const planned = originalPlanned + addedPlanned;
  const completed = originalCompleted + addedCompleted;
  if (!validCount(planned) || !validCount(completed) || planned === 0) return null;
  return {
    original: { planned: originalPlanned, completed: originalCompleted },
    added: { planned: addedPlanned, completed: addedCompleted },
    planned,
    completed,
    remaining: planned - completed,
    percent: Math.round((completed / planned) * 1000) / 10
  };
}
