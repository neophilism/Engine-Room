import React from "react";
import type { PortfolioProjectOverview } from "../../lib/domain/portfolio-overview";
import { calculatePortfolioWorkload } from "../../lib/domain/portfolio-statistics";
import { BrassPanel, Gauge, GlassTube, IndicatorLamp, MachineGrid } from "../machine";

export function PortfolioProgressMachine({ projects }: { projects: readonly PortfolioProjectOverview[] }) {
  const workload = calculatePortfolioWorkload(projects);
  const { completedRoadmapPrs: completed, plannedRoadmapPrs: planned } = workload;
  const state = planned === 0 ? "neutral" : completed === planned ? "complete" : "active";

  return (
    <BrassPanel title="Total Portfolio Progress" eyebrow="All approved roadmaps" className="portfolio-total-machine"
      status={<IndicatorLamp state={state} label={planned === 0 ? "Awaiting approved roadmaps" : completed === planned ? "Roadmap work complete" : "Roadmap work underway"} />}>
      {planned === 0 ? <p>No approved roadmap work is available yet.</p> : (
        <MachineGrid label="Portfolio progress instruments" columns={3}>
          <Gauge label="Merged roadmap PRs" value={completed} max={planned} state={state} unit=" PRs" />
          <div className="portfolio-total-readout">
            <span className="machine-engraved-label">Weighted portfolio completion</span>
            <GlassTube label="Total portfolio roadmap progress" value={completed} max={planned} state={state} size="large" showScale />
            <strong>{workload.percent}% complete</strong>
            <span>{completed} of {planned} approved PRs merged</span>
          </div>
          <dl className="portfolio-workload">
            <div><dt>PRs underway</dt><dd>{workload.underway}</dd></div>
            <div><dt>PRs remaining</dt><dd>{workload.remaining}</dd></div>
          </dl>
        </MachineGrid>
      )}
      <p className="portfolio-calculation-note">Merged approved PRs ÷ all approved planned PRs. Production readiness is tracked separately.</p>
    </BrassPanel>
  );
}
