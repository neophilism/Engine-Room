import React from "react";
import type { PlannedProgress } from "../../lib/domain/planned-progress";

/**
 * One unified planned-work denominator:
 * green = verified full-scope merged PR mappings; yellow = linked PR activity;
 * unfilled = no verified full-scope mapping. Software implementation is a separate source finding. PR acceptance is counted separately. Original work and later additions have identical
 * completion semantics and are never separate color categories.
 */
export function PlannedProgressTube({
  progress, label, compact = false
}: { progress: PlannedProgress; label: string; compact?: boolean }) {
  const mergedWidth = (100 * progress.completed) / progress.planned;
  const openWidth = (100 * progress.inProgress) / progress.planned;

  return <div
    className={`planned-progress-tube${compact ? " planned-progress-compact" : ""}`}
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={progress.planned}
    aria-valuenow={progress.completed}
    aria-valuetext={`${progress.completed} packages mapped to merged PRs, ${progress.inProgress} with linked PR activity, ${progress.notStarted} without a verified full-scope merge mapping; ${progress.planned} planned packages total`}
    title={`Merged package mappings: ${progress.completed}/${progress.planned}; linked PR activity: ${progress.inProgress}; other mappings unverified: ${progress.notStarted}`}
  >
    <span className="planned-progress-chamber" aria-hidden="true">
      <span className="planned-progress-merged-fill" style={{ width: `${mergedWidth}%` }} />
      <span className="planned-progress-open-fill"
        style={{ left: `${mergedWidth}%`, width: `${openWidth}%` }} />
    </span>
  </div>;
}
