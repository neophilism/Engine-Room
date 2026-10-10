import React from "react";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { calculatePortfolioWorkload } from "../../lib/domain/portfolio-statistics";
import { BrassPanel, Gauge, GlassTube, IndicatorLamp, MachineGrid } from "../machine";

export function PortfolioProgressMachine({ projects }: { projects: readonly PortfolioProjectOverview[] }) {
  const workload = calculatePortfolioWorkload(projects);
  const { completedRoadmapPrs: completed, plannedRoadmapPrs: planned } = workload;
  const covered=projects.filter(p=>p.planned>0&&p.completionMeasured!==false).length;
  const incomplete=covered<projects.length;
  const state = planned === 0 ? "neutral" : completed === planned && !incomplete ? "complete" : "active";

  return (
    <BrassPanel title="Mapped Roadmap Progress" eyebrow="Approved roadmap coverage" className="portfolio-total-machine"
      status={<IndicatorLamp state={state} label={planned === 0 ? "Awaiting approved roadmaps" : incomplete ? "Coverage incomplete" : completed === planned ? "Mapped work merged" : "Mapped work underway"} />}>
      {planned === 0 ? <p>No approved roadmap work is available yet.</p> : (
        <MachineGrid label="Portfolio progress instruments" columns={3}>
          <Gauge label="Merged roadmap PRs" value={completed} max={planned} state={state} unit=" PRs" />
          <div className="portfolio-total-readout">
            <span className="machine-engraved-label">Mapped roadmap completion</span>
            <GlassTube label="Total portfolio roadmap progress" value={completed} max={planned} state={state} size="large" showScale />
            <strong>{workload.percent}% complete</strong>
            <span>{completed} of {planned} original items merged</span>
          </div>
          <dl className="portfolio-workload">
            <div><dt>Open GitHub PRs</dt><dd>{projects.reduce((sum,p)=>sum+(p.activity?.open??p.inProgress),0)}</dd></div>
            <div><dt>Mapped items remaining</dt><dd>{workload.remaining}</dd></div>
          </dl>
        </MachineGrid>
      )}
      <p className="portfolio-calculation-note">{covered}/{projects.length} projects have complete roadmap mappings. {incomplete?"Coverage incomplete. ":""}This gauge measures mapped original items. Merged work does not establish deployment or production readiness.</p>
    </BrassPanel>
  );
}
