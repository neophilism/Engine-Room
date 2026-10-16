"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DevelopmentVelocityData, VelocityProject } from "../../lib/domain/development-velocity";
import {
  boardroomImpact, dayAt, dayOrdinal, mergedByDay,
  velocityBuckets, velocityStats, type ChartRange, type VelocityMeasure
} from "../../lib/domain/development-velocity-chart";

function formatDay(day: string): string {
  return new Date(day + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC"
  });
}
function formatDateTime(value: string | null): string {
  if (!value) return "Not yet synchronized";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC"
  }) + " UTC";
}
function trendLabel(now: number, before: number): string {
  if (before === 0) return now === 0 ? "No change" : "New activity";
  const percentage = Math.round((now / before - 1) * 100);
  return (percentage > 0 ? "+" : "") + percentage + "%";
}

function VelocityChart({
  projects, selectedId, range, measure, today, marker
}: {
  projects: readonly VelocityProject[];
  selectedId: string;
  range: ChartRange;
  measure: VelocityMeasure;
  today: string;
  marker: string | null;
}) {
  const buckets = velocityBuckets(projects, selectedId, range, measure, today);
  const w = 900, h = 328, left = 55, right = 24, top = 40, bottom = 51;
  const plotWidth = w - left - right, plotHeight = h - top - bottom;
  const maximum = Math.max(1, ...buckets.map((bucket) => bucket.value));
  const yMax = Math.ceil(maximum * 1.1);
  const band = plotWidth / Math.max(1, buckets.length);
  const y = (value: number) => top + plotHeight - (value / yMax) * plotHeight;
  const center = (index: number) => left + band * (index + .5);
  const line = buckets.map((bucket, index) =>
    (index ? "L" : "M") + center(index).toFixed(2) + "," + y(bucket.value).toFixed(2)
  ).join(" ");
  const first = dayOrdinal(buckets[0].from);
  const last = dayOrdinal(buckets[buckets.length - 1].to);
  const markerIndex = marker ? dayOrdinal(marker) : null;
  const markerX = markerIndex !== null && markerIndex >= first && markerIndex <= last ?
    left + (markerIndex - first + .5) / (last - first + 1) * plotWidth : null;
  const axis = [0, 1, 2, 3, 4].map(index => Math.round(yMax * index / 4));
  const tickStride = Math.max(1, Math.ceil(buckets.length / 6));
  const title = selectedId === "portfolio" ? "Entire portfolio" :
    projects.find(project => project.id === selectedId)?.name || "Project";
  const unit = range > 30 ? "seven-day periods" : "UTC days";
  const accessible = title + " development history: " +
    (measure === "rate" ? "merged pull requests per " + unit : "cumulative merged pull requests within selected range") +
    ". " + buckets.map(bucket => bucket.from + ": " + bucket.merges).join("; ");

  return (
    <div className="velocity-chart-wrap">
      <svg className="velocity-chart" role="img" aria-label={accessible} viewBox={"0 0 " + w + " " + h}>
        <title>{title + " · " + (measure === "rate" ? "Merged PR velocity" : "Cumulative merged PRs")}</title>
        <rect x={left} y={top} width={plotWidth} height={plotHeight} className="velocity-plot-bg" />
        {axis.map((value, index) => (
          <g key={index}>
            <line x1={left} y1={y(value)} x2={w - right} y2={y(value)} className="velocity-gridline" />
            <text x={left - 10} y={y(value) + 4} textAnchor="end" className="velocity-axis-label">{value}</text>
          </g>
        ))}
        {measure === "rate" ? buckets.map((bucket, index) => {
          const height = Math.max(0, plotHeight + top - y(bucket.value));
          return (
            <rect
              key={bucket.from}
              x={left + index * band + Math.min(band * .15, 4)}
              y={y(bucket.value)}
              width={Math.max(1, band - Math.min(band * .3, 8))}
              height={height}
              rx={Math.min(2, band / 8)}
              className={bucket.partial ? "velocity-bar velocity-bar-partial" : "velocity-bar"}
            >
              <title>{formatDay(bucket.from) + (bucket.to !== bucket.from ? "–" + formatDay(bucket.to) : "") +
                ": " + bucket.merges + " PRs merged" + (bucket.partial ? " · period includes partial today" : "")}</title>
            </rect>
          );
        }) : (
          <>
            <path d={line} className="velocity-line" />
            {buckets.filter((_, index) => buckets.length <= 30 || index % 3 === 0).map((bucket) => {
              const index = buckets.indexOf(bucket);
              return <circle key={bucket.from} cx={center(index)} cy={y(bucket.value)}
                r={3.5} className="velocity-dot">
                <title>{formatDay(bucket.to) + ": " + bucket.value + " cumulative merged PRs"}</title>
              </circle>;
            })}
          </>
        )}
        {markerX !== null && (
          <g>
            <line x1={markerX} x2={markerX} y1={top} y2={top + plotHeight} className="velocity-marker-line"/>
            <text x={markerX < w * .7 ? markerX + 6 : markerX - 6}
              textAnchor={markerX < w * .7 ? "start" : "end"}
              y={top - 13} className="velocity-marker-label">Boardroom start</text>
          </g>
        )}
        {buckets.map((bucket,index) => (index % tickStride === 0 || index === buckets.length - 1) ?
          <text key={bucket.from} x={center(index)} y={h - 20} textAnchor="middle" className="velocity-axis-label">
            {formatDay(bucket.from)}
          </text> : null)}
        <text x={left} y={h - 3} className="velocity-axis-note">
          {measure === "rate" ? "Merged PRs / " + (range > 30 ? "7-day bucket" : "day") : "Cumulative PR merges"}
        </text>
        <text x={w - right} y={h - 3} textAnchor="end" className="velocity-axis-note">UTC · today is partial</text>
      </svg>
    </div>
  );
}

function MiniTrend({ projects, id, today }: {
  projects: readonly VelocityProject[]; id: string; today: string
}) {
  const counts = mergedByDay(projects, id), end = dayOrdinal(today);
  const values = Array.from({length:28}, (_,index)=>counts.get(dayAt(end - 28 + index)) || 0);
  const high = Math.max(1, ...values);
  const points = values.map((v,index) =>
    (3 + index * 4).toFixed(1) + "," + (30 - 25 * v / high).toFixed(1)
  ).join(" ");
  return <svg className="velocity-sparkline" viewBox="0 0 116 34" role="img"
    aria-label={"Last 28 complete UTC days; " + values.reduce((sum,v)=>sum+v,0) + " merged PRs"}>
    <line x1="3" x2="111" y1="30" y2="30" className="velocity-spark-axis" />
    <polyline points={points} className="velocity-spark-line" />
  </svg>;
}

export function DevelopmentVelocity({ data }: {data: DevelopmentVelocityData}) {
  const router = useRouter();
  const [selectedId,setSelectedId] = useState("portfolio");
  const [range,setRange] = useState<ChartRange>(30);
  const [measure,setMeasure] = useState<VelocityMeasure>("rate");
  const [search,setSearch] = useState("");
  const [markerDraft,setMarkerDraft] = useState(data.boardroomStartDate || data.observedAt.slice(0,10));
  const [saving,setSaving] = useState(false);
  const [markerFeedback,setMarkerFeedback] = useState("");
  const today = data.observedAt.slice(0,10);
  const stats = velocityStats(data.projects,selectedId,today);
  const impact = boardroomImpact(data.projects,selectedId,data.boardroomStartDate,today);
  const cohort = useMemo(()=>data.boardroomStartDate ?
    data.projects.filter(project=>project.days.some(point=>point.day < data.boardroomStartDate!)) : [],
  [data.projects,data.boardroomStartDate]);
  const cohortImpact = data.boardroomStartDate ?
    boardroomImpact(cohort,"portfolio",data.boardroomStartDate,today) : null;
  const selectedName = selectedId === "portfolio" ? "Entire portfolio" :
    data.projects.find(project=>project.id===selectedId)?.name || "Project";
  const ranked = useMemo(()=>data.projects.map(project=>({
    project, stats:velocityStats([project],"portfolio",today)
  })).sort((a,b)=>b.stats.last7-a.stats.last7 || b.stats.last28-a.stats.last28 ||
    a.project.name.localeCompare(b.project.name)),[data.projects,today]);
  const visible = ranked.filter(row=>
    (row.project.name+" "+row.project.repositories.join(" ")).toLowerCase().includes(search.trim().toLowerCase()));
  const total = data.projects.length;

  async function saveMarker(date: string | null) {
    if (saving) return;
    setSaving(true);setMarkerFeedback("");
    try {
      const response=await fetch("/api/admin/velocity-marker",{
        method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({date})
      });
      const result: {error?:string} = await response.json();
      if(!response.ok)throw new Error(result.error || "Could not save the comparison date");
      setMarkerFeedback("Boardroom comparison date saved.");
      router.refresh();
    } catch(error) {
      setMarkerFeedback(error instanceof Error ? error.message : "Unable to save the date.");
    } finally {setSaving(false);}
  }

  if(data.source!=="database") {
    return <section className="velocity-panel" aria-label="Development velocity">
      <div className="velocity-header"><h2>Development velocity</h2></div>
      <p>Merge history unavailable ({data.source}). The graph does not invent activity when the database is unavailable.</p>
    </section>;
  }

  return <section className="velocity-panel" aria-labelledby="velocity-heading">
    <div className="velocity-header">
      <div>
        <p className="eyebrow">Development throughput · source: GitHub merge timestamps</p>
        <h2 id="velocity-heading">Development velocity</h2>
        <p>Compare verified merges over time, project by project. Your manual Refresh updates this graph.</p>
      </div>
      <span className="velocity-source-chip">
        {data.synchronizedRepositories + "/" + data.trackedRepositories + " repositories synced"}
      </span>
    </div>
    <p className="velocity-observed">
      Latest successful GitHub synchronization: <strong>{formatDateTime(data.latestSuccessfulSyncAt)}</strong>
      {data.trackedRepositories !== data.synchronizedRepositories ? " · Some repositories have not synced successfully." : ""}
      {data.oldestSuccessfulSyncAt && data.oldestSuccessfulSyncAt !== data.latestSuccessfulSyncAt ?
        " · Oldest checkpoint: " + formatDateTime(data.oldestSuccessfulSyncAt) : ""}
    </p>
    <div className="velocity-controls">
      <label>Project
        <select value={selectedId} onChange={event=>setSelectedId(event.target.value)}
          aria-label="Project development velocity">
          <option value="portfolio">Entire portfolio ({total})</option>
          {data.projects.map(project=><option value={project.id} key={project.id}>{project.name}</option>)}
        </select>
      </label>
      <label>Period
        <select aria-label="Velocity time window" value={range} onChange={event=>setRange(Number(event.target.value) as ChartRange)}>
          <option value={14}>Last 14 days</option><option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option><option value={365}>Last 12 months</option>
        </select>
      </label>
      <label>Graph
        <select aria-label="Velocity graph measure" value={measure} onChange={event=>setMeasure(event.target.value as VelocityMeasure)}>
          <option value="rate">Merger rate</option><option value="cumulative">Cumulative merges</option>
        </select>
      </label>
    </div>
    <div className="velocity-stat-grid" aria-label={selectedName + " development rate"}>
      <div><small>Last 7 completed days</small><strong>{stats.last7}</strong><span>merged PRs</span></div>
      <div><small>Previous 7 completed days</small><strong>{stats.previous7}</strong><span>merged PRs</span></div>
      <div><small>Week-over-week change</small><strong>{trendLabel(stats.last7,stats.previous7)}</strong>
        <span>{stats.previous7 === 0 ? "No percentage baseline" : "compared with preceding week"}</span></div>
      <div><small>Last 28 completed days</small><strong>{stats.last28}</strong><span>merged PRs</span></div>
    </div>
    <VelocityChart projects={data.projects} selectedId={selectedId} range={range} measure={measure} today={today}
      marker={data.boardroomStartDate}/>
    <div className="velocity-boardroom">
      <div className="velocity-boardroom-title">
        <strong>Boardroom rollout comparison</strong>
        <span>{data.boardroomStartDate ?
          "Start: " + formatDay(data.boardroomStartDate) + ", " + data.boardroomStartDate.slice(0,4) + " UTC" :
          "Not activated yet"}</span>
      </div>
      {impact ? <>
        <p>Matched full weeks for <b>{selectedName}</b>, excluding the activation day:
          <strong> {impact.before} PRs before → {impact.after} PRs after</strong>
          {" · " + trendLabel(impact.after,impact.before)}
          {impact.multiplier !== null ? " · " + impact.multiplier.toFixed(2) + "× throughput" : ""}.
        </p>
        {selectedId==="portfolio" && cohortImpact && <p className="velocity-cohort">
          Existing pre-active project cohort ({cohort.length} projects): {cohortImpact.before} before → {cohortImpact.after} after
          {" (" + trendLabel(cohortImpact.after,cohortImpact.before) + ")"}.
        </p>}
      </> : <p>
        {data.boardroomStartDate ?
          "After seven complete days following the recorded rollout, a matched before-and-after comparison will appear. The rollout day itself is excluded." :
          "Record the day Boardroom actually begins influencing the development workflow; the chart will mark it and compare equally sized weeks before and after."}
      </p>}
      <div className="velocity-marker-controls">
        <label>Actual Boardroom activation date (UTC)
          <input type="date" aria-label="Boardroom activation date" max={today}
            value={markerDraft} onChange={event=>setMarkerDraft(event.target.value)}/>
        </label>
        <button type="button" disabled={saving || !markerDraft} onClick={()=>{void saveMarker(markerDraft);}}>
          {saving ? "Saving…" : data.boardroomStartDate ? "Update date" : "Mark activation"}
        </button>
        {data.boardroomStartDate && <button className="velocity-secondary-button" type="button"
          disabled={saving} onClick={()=>{void saveMarker(null);}}>Clear marker</button>}
      </div>
      {markerFeedback && <p role="status" className="velocity-feedback">{markerFeedback}</p>}
      <p className="velocity-method">
        Administrative change, stored with an audit trail. This measures observed PR throughput—not quality, labor hours, roadmap acceptance, or proof that Boardroom caused the change.
      </p>
    </div>
    <div className="velocity-project-list">
      <div className="velocity-project-heading">
        <div><h3>Every project&#39;s development trend</h3>
          <p>Seven-day rates and daily history. Select a project to inspect the graph above.</p></div>
        <label>Find a project <input type="search" value={search} placeholder="Search all projects"
          onChange={event=>setSearch(event.target.value)} aria-label="Filter development velocity projects"/></label>
      </div>
      <div className="velocity-table-scroll">
        <table className="velocity-table">
          <thead><tr><th scope="col">Project</th><th scope="col">Last 7 days</th>
            <th scope="col">Previous 7 days</th><th scope="col">Change</th><th scope="col">28-day history</th></tr></thead>
          <tbody>{visible.map(({project,stats:row})=><tr key={project.id} className={selectedId===project.id ? "velocity-row-selected" : ""}>
            <td><button type="button" aria-pressed={selectedId===project.id} onClick={()=>setSelectedId(project.id)}>
              {project.name}</button></td>
            <td>{row.last7}</td><td>{row.previous7}</td><td>{trendLabel(row.last7,row.previous7)}</td>
            <td><MiniTrend projects={data.projects} id={project.id} today={today}/></td>
          </tr>)}</tbody>
        </table>
        {visible.length===0 && <p>No matching projects.</p>}
      </div>
      <p className="velocity-method">Showing {visible.length} of {total} projects. Each miniature trend spans 28 complete UTC days; the most recent calendar day is excluded to avoid understating a partial day.</p>
    </div>
    <details className="velocity-methodology">
      <summary>How development speed is measured</summary>
      <p>Only GitHub PR records with a non-null <code>merged_at</code> timestamp count. One merged PR counts once per linked primary repository, irrespective of size or number of commits. Open, draft and unmerged PRs do not count. Chart dates use UTC.</p>
      <p>The history is reconstructed from saved GitHub metadata. It only becomes more current when Engine Room&#39;s manual Refresh is used, or if you explicitly re-enable Automatic. No extra GitHub fetch or scheduled database poll is added by this graph.</p>
      <p>Week-over-week uses seven completed UTC days versus the preceding seven, excluding today&#39;s partial results. Boardroom comparisons use seven completed days before and seven after the recorded start; new projects and changes in PR size can affect aggregate counts. The pre-active cohort is shown separately to help distinguish new-project expansion from greater output in existing projects.</p>
      <p>PR throughput is not a measure of accepted roadmap work. Consult the project progress bars for verified milestone completion and release acceptance.</p>
    </details>
  </section>;
}
