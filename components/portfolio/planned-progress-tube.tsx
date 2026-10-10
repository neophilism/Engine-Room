import React from "react";
import type { PlannedProgress } from "../../lib/domain/planned-progress";

/**
 * Green: completed units from the original plan.
 * Amber: completed units from explicitly documented plan additions.
 * Empty space: ALL other planned units, including items with no PR yet.
 */
export function PlannedProgressTube({
  progress, label, compact = false
}: { progress: PlannedProgress; label: string; compact?: boolean }) {
  const originalWidth = (100 * progress.original.completed) / progress.planned;
  const additionStart = (100 * progress.original.planned) / progress.planned;
  const additionWidth = (100 * progress.added.completed) / progress.planned;

  return <div
    className={`planned-progress-tube${compact ? " planned-progress-compact" : ""}`}
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={progress.planned}
    aria-valuenow={progress.completed}
    aria-valuetext={`${progress.completed} of ${progress.planned} planned items complete`}
    title={`Original: ${progress.original.completed}/${progress.original.planned}; added: ${progress.added.completed}/${progress.added.planned}`}
  >
    <span className="planned-progress-endcap" aria-hidden="true" />
    <span className="planned-progress-chamber" aria-hidden="true">
      <span className="planned-progress-original-fill" style={{ width: `${originalWidth}%` }} />
      {progress.added.planned > 0 && <>
        <span className="planned-progress-added-fill" style={{ left: `${additionStart}%`, width: `${additionWidth}%` }} />
        <span className="planned-progress-boundary" style={{ left: `${additionStart}%` }} />
      </>}
      <span className="planned-progress-reflection" />
    </span>
    <span className="planned-progress-endcap" aria-hidden="true" />
  </div>;
}
