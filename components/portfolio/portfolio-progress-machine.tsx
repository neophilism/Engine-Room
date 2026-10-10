import React from "react";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { calculatePortfolioWorkload } from "../../lib/domain/portfolio-statistics";
import { BrassPanel, Gauge, IndicatorLamp, MachineGrid } from "../machine";
import { PlannedProgressTube } from "./planned-progress-tube";
import { summarizePlannedProgress } from "../../lib/domain/planned-progress";

export function PortfolioProgressMachine({ projects }: { projects: readonly PortfolioProjectOverview[] }) {
  const workload = calculatePortfolioWorkload(projects);
  const { completedRoadmapPrs: completed, plannedRoadmapPrs: planned } = workload;
  const verified = projects.map(summarizePlannedProgress).filter((p) => p !== null);
  const original = verified.reduce((p, entry) => ({ planned: p.planned + entry.original.planned, completed: p.completed + entry.original.completed }), {planned:0, completed:0});
  const added = verified.reduce((p, entry) => ({ planned: p.planned + entry.added.planned, completed: p.completed + entry.added.completed }), {planned:0, completed:0});
  const aggregate = { original, added, planned, completed, remaining: planned - completed, percent: workload.percent };
  const covered=projects.filter(p=>p.planned>0&&p.completionMeasured!==false).length;
  const incomplete=covered<projects.length;
  const state = planned === 0 ? "neutral" : completed === planned && !incomplete ? "complete" : "active";

  return (
    <BrassPanel title="Development Plan Progress" eyebrow="Documented planned work" className="portfolio-total-machine"
      status={<IndicatorLamp state={state} label={planned === 0 ? "Awaiting approved roadmaps" : incomplete ? "Coverage incomplete" : completed === planned ? "Mapped work merged" : "Mapped work underway"} />}>
      {planned === 0 ? <p>No approved roadmap work is available yet.</p> : (
        <MachineGrid label="Portfolio progress instruments" columns={3}>
          <Gauge label="Merged roadmap PRs" value={completed} max={planned} state={state} unit=" PRs" />
          <div className="portfolio-total-readout">
            <span className="machine-engraved-label">Total planned completion</span>
            <PlannedProgressTube label="Total portfolio roadmap progress" progress={aggregate} />
            <strong>{workload.percent}% complete</strong>
            <span>{completed} of {planned} planned items verified complete</span>
          </div>
          <dl className="portfolio-workload">
            <div><dt>Planned items remaining</dt><dd>{workload.remaining}</dd></div>
            <div><dt>Added planned items</dt><dd>{added.completed}/{added.planned}</dd></div>
          </dl>
        </MachineGrid>
      )}
      <p className="portfolio-calculation-note">{covered}/{projects.length} projects have complete roadmap mappings. {incomplete?"Coverage incomplete. ":""}All planned items stay in the denominator, whether mapped to a PR yet or not. <span className="original-work">Green: original planned work</span>; <span className="added-work">amber: planned additions</span>. Merged work does not establish production readiness.</p>
    </BrassPanel>
  );
}
