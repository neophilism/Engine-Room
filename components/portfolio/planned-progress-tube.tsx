import React from "react";
import type { PlannedProgress } from "../../lib/domain/planned-progress";

/**
 * One unified planned-work denominator:
 * green = accepted packages with merged evidence; yellow = verified work underway, including merged contributions awaiting package acceptance;
 * unfilled = not started. Original work and later additions have identical
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
    aria-valuetext={`${progress.completed} accepted and merged, ${progress.inProgress} underway or awaiting acceptance, ${progress.notStarted} not started; ${progress.planned} planned units total`}
    title={`Accepted: ${progress.completed}/${progress.planned}; underway: ${progress.inProgress}; not started: ${progress.notStarted}`}
  >
    <span className="planned-progress-chamber" aria-hidden="true">
      <span className="planned-progress-merged-fill" style={{ width: `${mergedWidth}%` }} />
      <span className="planned-progress-open-fill"
        style={{ left: `${mergedWidth}%`, width: `${openWidth}%` }} />
    </span>
  </div>;
}
