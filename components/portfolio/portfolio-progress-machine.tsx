import React from "react";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { calculatePortfolioWorkload } from "../../lib/domain/portfolio-statistics";
import { BrassPanel, Gauge, IndicatorLamp, MachineGrid } from "../machine";
import { DualProgress } from "./dual-progress";
import { aggregateTimeCompletion } from "../../lib/domain/time-completion";
import { summarizePlannedProgress } from "../../lib/domain/planned-progress";

export function PortfolioProgressMachine({ projects }: { projects: readonly PortfolioProjectOverview[] }) {
  const workload = calculatePortfolioWorkload(projects);
  const { completedRoadmapPrs: completed, plannedRoadmapPrs: planned } = workload;
  const aggregate = {
    // Historical provenance is not a visual status category.
    original: {planned,completed}, added: {planned:0,completed:0},
    planned, completed, inProgress:workload.underway, notStarted:workload.notStarted,
    remaining:planned-completed,percent:workload.percent
  };
  const scopedProjects=projects.filter(p=>summarizePlannedProgress(p)!==null);
  const at=scopedProjects.find(p=>p.timeForecast)?.timeForecast?.asOf??"1970-01-01T00:00:00.000Z";
  const timeForecast=aggregateTimeCompletion(scopedProjects.map(p=>p.timeForecast),at);
  const covered = projects.filter(p=>p.planned>0&&p.completionMeasured!==false).length;
  const incomplete = covered < projects.length;
  const state = planned===0 ? "neutral" : completed===planned&&!incomplete ? "complete" : "active";

  return (
    <BrassPanel title="Development plan progress" eyebrow="All documented work" className="portfolio-total-machine"
      status={<IndicatorLamp state={state} label={planned===0?"Awaiting documented plans":
        incomplete?"Mapping incomplete":completed===planned?"All plan work merged":"Work in progress"} />}>
      {planned===0 ? <p>No approved roadmap work is available yet.</p> : (
        <MachineGrid label="Portfolio progress instruments" columns={3}>
          <Gauge label="Merged planned items" value={completed} max={planned} state={state} unit=" PRs" />
          <div className="portfolio-total-readout">
            <span className="machine-engraved-label">All planned work</span>
            <DualProgress workLabel="Total portfolio roadmap progress"
              timeLabel="Total portfolio projected time progress"
              progress={aggregate} forecast={timeForecast} />
            <strong>{workload.percent}% merged</strong>
            <span>{completed} merged · {workload.underway} open / unmerged · {workload.notStarted} not started</span>
          </div>
          <dl className="portfolio-workload">
            <div><dt>Planned items remaining</dt><dd>{workload.remaining}</dd></div>
            <div><dt>Open / awaiting merge</dt><dd>{workload.underway}</dd></div>
          </dl>
        </MachineGrid>
      )}
      <p className="portfolio-calculation-note">{covered}/{projects.length} projects have complete roadmap mappings.
        The denominator includes original and newly added plan work equally. Green is merged;
        yellow is written but unmerged (regardless of CI); empty is unstarted.
        The second bar measures elapsed time against a changeable completion estimate, not completed PRs.
        A merge does not establish production readiness.</p>
    </BrassPanel>
  );
}
