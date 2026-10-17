import React from "react";
import type { PlannedProgress } from "../../lib/domain/planned-progress";

/**
 * One unified planned-work denominator:
 * green = completed work-package scope; yellow = package scope still in progress (possibly with accepted merged PR contributions);
 * unfilled = not started. PR acceptance is counted separately. Original work and later additions have identical
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
    aria-valuetext={`${progress.completed} full-scope packages complete, ${progress.inProgress} packages in progress, ${progress.notStarted} not started; ${progress.planned} planned packages total`}
    title={`Fully complete packages: ${progress.completed}/${progress.planned}; unfinished scope: ${progress.inProgress}; not started: ${progress.notStarted}`}
  >
    <span className="planned-progress-chamber" aria-hidden="true">
      <span className="planned-progress-merged-fill" style={{ width: `${mergedWidth}%` }} />
      <span className="planned-progress-open-fill"
        style={{ left: `${mergedWidth}%`, width: `${openWidth}%` }} />
    </span>
  </div>;
}
