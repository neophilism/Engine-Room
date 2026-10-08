"use client";

import React, { useState } from "react";
import Link from "next/link";
import { incidentPipeline, incidentStates, incidentSeverities, type IncidentState, type IncidentSeverity, type IncidentsOverview } from "../../lib/domain/incidents";
import { BrassPanel, FlowStation, IndicatorLamp, MachineFlow } from "../machine";

export function IncidentsDashboard({ overview }: { overview: IncidentsOverview }) {
  const [state, setState] = useState<IncidentState | "open" | "all">("open");
  const [severity, setSeverity] = useState<IncidentSeverity | "all">("all");
  const incidents = overview.incidents.filter((incident) => (state === "all" || (state === "open" ? incident.state !== "resolved" : incident.state === state)) && (severity === "all" || incident.severity === severity));
  return <BrassPanel title="Incident response" eyebrow="Source to resolution">
    {overview.source === "database" && <p>{overview.incidents.filter((incident) => incident.state !== "resolved").length} open · {overview.incidents.filter((incident) => incident.state !== "resolved" && incident.severity === "critical").length} critical</p>}
    <div className="incident-controls">
      <label className="activity-filter">Incident state<select value={state} onChange={(event) => setState(event.target.value as typeof state)}><option value="open">Open incidents</option><option value="all">All states</option>{incidentStates.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="activity-filter">Severity<select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)}><option value="all">All severities</option>{incidentSeverities.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    {incidents.length === 0 ? <p>{overview.source === "error" ? "Incident data is unavailable. Refresh to try again." : overview.source === "unconfigured" ? "Connect an incident source to measure response activity." : "No incidents match this view."}</p> : incidents.map((incident) => <article className="release-pipeline-record" key={incident.id}>
      <header><Link href={`/projects/${encodeURIComponent(incident.projectSlug)}`}>{incident.projectName}</Link><strong>{incident.title}</strong><span>{incident.environment} · {incident.source}</span>
        <IndicatorLamp label={`${incident.severity} · ${incident.state}`} state={incident.state === "resolved" ? "complete" : incident.severity === "critical" ? "blocked" : "active"} /></header>
      <MachineFlow label={`${incident.title} response pipeline`} state={incident.state === "resolved" ? "complete" : "active"}>
        {incidentPipeline(incident.state).map((stage, index) => <FlowStation key={stage.label} title={stage.label} eyebrow={`0${index + 1}`} state={stage.state} detail={stage.state === "complete" ? "Recorded stage reached" : stage.state === "active" ? incident.state : "Awaiting event"} />)}
      </MachineFlow>
      {incident.lastNote && <p>{incident.lastNote}</p>}
      <p>Detected <time dateTime={incident.occurredAt}>{incident.occurredAt.replace("T", " ").slice(0, 19)} UTC</time>{incident.resolvedAt && <> · Resolved <time dateTime={incident.resolvedAt}>{incident.resolvedAt.replace("T", " ").slice(0, 19)} UTC</time></>}</p>
      {incident.evidenceUrl && <a href={incident.evidenceUrl} target="_blank" rel="noreferrer">Source evidence</a>}
    </article>)}
    <p className="portfolio-calculation-note">Acknowledgement, containment, resolution, and reopening are recorded events with an actor and response note.</p>
  </BrassPanel>;
}
