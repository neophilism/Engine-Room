"use client";

import React, { useState } from "react";
import Link from "next/link";
import { releasePipeline, releaseStates, type ReleaseState, type ReleasesOverview } from "../../lib/domain/releases";
import { BrassPanel, FlowStation, IndicatorLamp, MachineFlow } from "../machine";

export function ReleasesDashboard({ overview }: { overview: ReleasesOverview }) {
  const [state, setState] = useState<ReleaseState | "all">("all");
  const releases = overview.releases.filter((release) => state === "all" || release.state === state);
  return <BrassPanel title="Release pipelines" eyebrow="Recorded delivery events">
    <label className="activity-filter">Release state<select value={state} onChange={(event) => setState(event.target.value as ReleaseState | "all")}>
      <option value="all">All states</option>{releaseStates.map((value) => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}
    </select></label>
    {releases.length === 0 ? <p>{overview.source === "error" ? "Release data is unavailable. Refresh to try again." : "No releases match this view."}</p> : releases.map((release) => <article className="release-pipeline-record" key={release.id}>
      <header><Link href={`/projects/${encodeURIComponent(release.projectSlug)}`}>{release.projectName}</Link><strong>{release.key}</strong><span>{release.environment} · {release.commitSha.slice(0, 12)}</span>
        <IndicatorLamp label={release.state.replaceAll("-", " ")} state={release.state === "live" ? "live" : release.state === "failed" ? "blocked" : release.state === "rolled-back" || release.state === "cancelled" ? "offline" : "active"} /></header>
      <MachineFlow label={`${release.projectName} ${release.key} release pipeline`} state={release.state === "failed" ? "blocked" : release.state === "live" ? "live" : "neutral"}>
        {releasePipeline(release.state, release.environment).map((stage, index) => <FlowStation key={stage.label} title={stage.label} eyebrow={`0${index + 1}`} state={stage.state} detail={stage.state === "complete" ? "Recorded stage reached" : stage.state === "active" ? "Current stage" : stage.state === "blocked" ? "Release failed" : "Awaiting event"} />)}
      </MachineFlow>
    </article>)}
    <p className="portfolio-calculation-note">Live and rollback state require recorded source evidence. A pipeline stage does not establish every production acceptance gate.</p>
  </BrassPanel>;
}
