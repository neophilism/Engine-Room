import type { SourcePlanSummary } from "./live-monitor";

/**
 * Every planned unit contributes to the same denominator, including newly
 * documented additions. Progress is: merged (green), written and open (yellow),
 * and not started/unverified (empty). Never confuse a passing check with merge.
 */
export type PlannedTrack = { planned: number; completed: number };
export type PlannedProgress = {
  /** Historical provenance only; never color-code original versus additions. */
  original: PlannedTrack;
  added: PlannedTrack;
  planned: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  remaining: number;
  percent: number;
};

export type PlanSource = {
  planned: number;
  completed: number;
  inProgress?: number;
  activity?: { open: number };
  sourcePlan?: SourcePlanSummary;
};

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function summarizePlannedProgress(source: PlanSource): PlannedProgress | null {
  const published = source.sourcePlan;
  const documentedOriginal = published?.original ?? 0;
  const documentedOriginalComplete = published?.originalComplete ?? 0;
  const addedPlanned = published?.added ?? 0;
  const addedCompleted = published?.addedComplete ?? 0;

  if (![source.planned,source.completed,documentedOriginal,
        documentedOriginalComplete,addedPlanned,addedCompleted].every(validCount) ||
      source.completed > source.planned ||
      documentedOriginalComplete > documentedOriginal ||
      addedCompleted > addedPlanned) {
    return null;
  }

  // A newer canonical source plan may expand beyond the legacy approved-plan
  // table; never discard legitimate additions merely because the old totals
  // differ. A legacy approved base and an additions-only document also combine.
  // A structured registry is the complete current approved unit list.
  // Never union an obsolete original plan into the current denominator.
  const structured = !!published?.documents.some(document => document.path === "registry/prs.json");
  const originalPlanned = structured ? documentedOriginal : Math.max(source.planned,documentedOriginal);
  const originalCompleted = structured ? documentedOriginalComplete : Math.max(source.completed,documentedOriginalComplete);
  const planned = originalPlanned + addedPlanned;
  const completed = originalCompleted + addedCompleted;
  if (!validCount(planned) || !validCount(completed) ||
      originalCompleted > originalPlanned || completed > planned || planned === 0) return null;

  // "Written" means a real, currently open GitHub PR, including drafts, work
  // undergoing CI, and work with green checks waiting for merge. The plan-item
  // state is the precise signal when a PR has been mapped. Legacy plan/monitor
  // open counts cover other opened PRs whose individual plan mapping is still
  // incomplete. Take the maximum rather than adding overlapping observations.
  // Cap yellow to the unmerged plan capacity: green and yellow never overlap.
  // Only explicitly mapped plan units may paint a structured progress bar
  // yellow. Stale or unrelated repository PRs cannot masquerade as planned work.
  const observedOpen = structured ? [published?.items.filter(item => item.state === "in-progress").length ?? 0] : [
    source.inProgress ?? 0,
    source.activity?.open ?? 0,
    published?.items.filter(item => item.state === "in-progress").length ?? 0
  ];
  const inProgress = Math.min(planned - completed,
    Math.max(0,...observedOpen.filter(validCount)));
  const notStarted = planned - completed - inProgress;

  return {
    original: { planned: originalPlanned, completed: originalCompleted },
    added: { planned: addedPlanned, completed: addedCompleted },
    planned,
    completed,
    inProgress,
    notStarted,
    remaining: planned - completed,
    percent: Math.round((completed / planned) * 1000) / 10
  };
}
