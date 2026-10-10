import React from "react";
import Link from "next/link";
import type { ProjectDashboardData } from "../../lib/domain/project-dashboard";
import { lifecycleStages } from "../../lib/domain/lifecycle-lanes";
import { githubRepositoryUrl } from "../../lib/domain/portfolio-query";
import { BrassPanel, GlassTube, IndicatorLamp } from "../machine";
import { PlannedProgressTube } from "../portfolio/planned-progress-tube";
import { summarizePlannedProgress } from "../../lib/domain/planned-progress";
import { ProjectFeatures } from "./project-features";
import { DevelopmentActivityTimeline } from "./development-activity";
import { SourcePlan } from "./source-plan";
import { ActivityMonitor } from "../portfolio/activity-monitor";
import { PortfolioRefresh } from "../portfolio/portfolio-refresh";
import { ProjectReadinessPanel } from "./project-readiness";

export function ProjectDashboard({ data }: { data: ProjectDashboardData }) {
  const project = data.project;
  if (!project) return <main className="content"><header className="hero"><h1>Project data unavailable</h1>
    <p>{data.source === "unconfigured" ? "Connect portfolio data to load project dashboards." : "The project could not be loaded. Try refreshing."}</p></header><Link href="/projects">← Projects</Link></main>;
  const stage = lifecycleStages[project.status];
  const unmapped = data.unverifiedRoadmapItems??data.graph?.plannedPullRequests.filter((pr) => !pr.repositoryId || !pr.githubPrNumber).length ?? 0;
  const planProgress = summarizePlannedProgress({
    planned: data.progress?.planned ?? 0,
    completed: data.progress?.completed ?? 0,
    sourcePlan: data.sourcePlan
  });
  const measured = planProgress !== null;
  return <main className="content">
    <header className="hero"><p className="eyebrow">Project intelligence</p><h1>{project.displayName}</h1><p>{project.summary || "No project summary has been registered yet."}</p>
      <Link href="/projects">← Compare projects</Link></header>
    <div className="project-dashboard-grid">
      <BrassPanel title="Approved roadmap" status={<IndicatorLamp state={stage.state} label={stage.label} />}>
        {planProgress ? <>
          <p>{data.graph ? `Plan version ${data.graph.plan.version}` : "Source development plan"} · {planProgress.completed}/{planProgress.planned} planned items verified complete</p>
          <PlannedProgressTube label={`${project.displayName} approved roadmap progress`} progress={planProgress} />
          {planProgress.added.planned > 0 && <p className="planned-progress-legend">
            <span className="original">Original {planProgress.original.completed}/{planProgress.original.planned}</span>
            <span className="added">Added {planProgress.added.completed}/{planProgress.added.planned}</span>
          </p>}
          <p>{planProgress.percent}% complete · {planProgress.remaining} planned items remaining</p>
          <p className="portfolio-calculation-note">{unmapped} items await mapping or release evidence; all remain in the planned denominator.</p>
        </> : <p>No approved development plan has been registered.</p>}
      </BrassPanel>
      <BrassPanel title="Repositories"><ul className="project-repository-links">{data.repositories.map((repository) => <li key={repository.id}>
        {githubRepositoryUrl(repository.fullName) ? <a href={githubRepositoryUrl(repository.fullName)} target="_blank" rel="noopener noreferrer">{repository.fullName} ↗</a> : repository.fullName}
        <span>{repository.visibility} · {repository.defaultBranch}{repository.archived ? " · archived" : ""}</span>
      </li>)}</ul>{data.repositories.length === 0 && <p>No repositories are linked yet.</p>}</BrassPanel>
    </div>
    <PortfolioRefresh/>
    <BrassPanel title="Original roadmap and added work"><SourcePlan plan={data.sourcePlan} historyHref={'/projects/'+encodeURIComponent(project.slug)+'/plans'}/></BrassPanel>
    <ActivityMonitor projects={[{...project,completed:data.progress?.completed||0,inProgress:data.graph?.plannedPullRequests.filter(p=>p.status==="in-progress").length||0,planned:data.progress?.planned||0,percent:data.progress?.percent||0,repositories:[],pullRequests:data.pullRequests,sourcePlan:data.sourcePlan,completionMeasured:data.progress?measured:!!data.sourcePlan?.original&&!data.sourcePlan.items.some(item=>item.scope==='original'&&item.state==='unmapped')}]}/>
    <BrassPanel title="Features" eyebrow="Delivery against linked approved work"><ProjectFeatures features={data.features ?? []} /></BrassPanel>
    {data.readiness && <ProjectReadinessPanel readiness={data.readiness} />}
    <BrassPanel title="Development activity" eyebrow="GitHub source records"><DevelopmentActivityTimeline activities={data.activities ?? []} /></BrassPanel>
    <BrassPanel title="Milestones" eyebrow="Current approved plan">
      {data.graph ? <ol className="project-milestones">{data.graph.milestones.map((milestone) => {
        const progress = data.milestones.find((row) => row.milestoneId === milestone.id)!;
        const state = progress.status === "blocked" ? "blocked" : progress.status === "complete" ? "complete" : progress.status === "active" ? "active" : "neutral";
        return <li key={milestone.id}><div><IndicatorLamp label={progress.status} state={state} size="small" /><strong>{milestone.name}</strong>
          <span>{progress.completed}/{progress.planned} PRs · {progress.status}</span></div>
          {progress.planned > 0 && <GlassTube label={`${milestone.name} milestone progress`} value={progress.completed} max={progress.planned} state={state} />}</li>;
      })}</ol> : <p>Milestones appear after a development plan is approved.</p>}
    </BrassPanel>
    {data.graph && <BrassPanel title="Roadmap work" eyebrow="Mapped units only advance completion">
      <ol className="project-roadmap-work">{data.graph.plannedPullRequests.map((pr) => <li key={pr.id}>
        <span>#{pr.ordinal}</span><strong>{pr.title}</strong><span>{pr.status}</span><span>{pr.githubPrNumber ? `GitHub PR #${pr.githubPrNumber}` : "Mapping pending"}</span>
      </li>)}</ol>
    </BrassPanel>}
  </main>;
}
