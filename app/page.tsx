import React from "react";
import { BrassPanel, FlowStation, GlassTube, IndicatorLamp, MachineFlow } from "../components/machine";
import { MachinePreview } from "../components/machine/machine-preview";

const roadmap = [
  { name: "Engine Room", completed: 8, planned: 40 },
  { name: "RAM Marketplace", completed: 20, planned: 20 },
  { name: "Compliance Engine", completed: 21, planned: 21 }
];

function percent(completed: number, planned: number) {
  return planned === 0 ? 0 : Math.round((completed / planned) * 100);
}

export default function Home() {
  return (
    <main className="content">
      <header className="hero">
        <p className="eyebrow">Software Portfolio</p>
        <h1>Engine Room</h1>
        <p>Portfolio-wide control from approved development plan through production operations.</p>
      </header>

      <BrassPanel eyebrow="Live roadmap" title="Portfolio progress" status={<IndicatorLamp state="live" label="Portfolio system" />}>
        <div className="project-list">
          {roadmap.map((project) => {
            const value = percent(project.completed, project.planned);
            const state = project.completed === project.planned ? "complete" : "live";

            return (
              <article className="project-row" key={project.name}>
                <button className="disclosure" aria-label={`Expand ${project.name}`}>▶</button>
                <strong>{project.name}</strong>
                <GlassTube
                  value={project.completed}
                  max={project.planned}
                  label={`${project.name} roadmap progress`}
                  state={state}
                  showScale
                />
                <span className="count">{project.completed}/{project.planned} PRs</span>
                <span className="percentage">{value}%</span>
              </article>
            );
          })}
        </div>

        <div className="home-machine-flow">
          <p className="machine-engraved-label">Roadmap signal path</p>
          <MachineFlow label="Roadmap progress data path">
            <FlowStation eyebrow="01" title="Approved Plan" detail="Defines the denominator." />
            <FlowStation eyebrow="02" title="Planned PRs" detail="Roadmap work units." />
            <FlowStation eyebrow="03" title="Merge Events" detail="Advance completed work." />
            <FlowStation eyebrow="04" title="Machine State" detail="Drives tubes and lamps." />
          </MachineFlow>
        </div>
      </BrassPanel>
      <MachinePreview />
    </main>
  );
}

