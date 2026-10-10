"use client";

import { orderProjectsByHierarchy, projectNameIndent } from "../../lib/domain/project-hierarchy";

import React, { useState } from "react";
import Link from "next/link";
import { assessProjectOperations, operationMetrics, DEFAULT_OPERATIONS_THRESHOLDS, type OperationMetric, type OperationsOverview } from "../../lib/domain/operations";
import { projectDashboardHref } from "../../lib/domain/project-dashboard";
import { BrassPanel, IndicatorLamp } from "../machine";

const metricLabels: Record<OperationMetric, string> = { "availability-percent": "Availability", "latency-p95-ms": "P95 latency", "requests-per-minute": "Requests/min", "error-rate-percent": "Error rate", "cpu-percent": "CPU", "memory-percent": "Memory", "worker-heartbeat-percent": "Worker presence" };
function format(value: number | undefined, metric: OperationMetric) { return value === undefined ? "Unknown" : `${Math.round(value * 100) / 100}${metric.endsWith("percent") ? "%" : metric.endsWith("ms") ? " ms" : ""}`; }

export function OperationsDashboard({ overview, evaluatedAt }: { overview: OperationsOverview; evaluatedAt: string }) {
  const [environment, setEnvironment] = useState("production");
  const environments = [...new Set(["production", ...overview.samples.map((sample) => sample.environment)])].sort();
  const projects = orderProjectsByHierarchy(overview.projects).map((project) => ({ ...project, assessment: assessProjectOperations(project.id, environment, overview.samples, new Date(evaluatedAt)) }));
  return <BrassPanel title="Operations & Performance" eyebrow="Current measured signals">
    <label className="activity-filter">Environment<select value={environment} onChange={(event) => setEnvironment(event.target.value)}>{environments.map((value) => <option key={value}>{value}</option>)}</select></label>
    <div className="operational-summary" aria-label="Operational summary">{(["nominal", "degraded", "unknown"] as const).map((status) => <div key={status}><span>{status}</span><strong>{projects.filter((project) => project.assessment.health === status).length}</strong></div>)}</div>
    {overview.source === "error" ? <p>Operational data is unavailable. Refresh to try again.</p> : projects.length === 0 ? <p>No projects are connected to operational monitoring yet.</p> :
      <div className="comparison-table-scroll" tabIndex={0} role="region" aria-label="Scrollable operations metrics"><table className="comparison-table">
        <caption>Latest readings by project · {environment}</caption><thead><tr><th scope="col">Project</th><th scope="col">Signal state</th>{operationMetrics.map((metric) => <th key={metric} scope="col">{metricLabels[metric]}</th>)}</tr></thead>
        <tbody>{projects.map(({ assessment, ...project }) => <tr key={project.id}><th scope="row"><Link className={projectNameIndent(project, projects) > 0 ? "project-name-indent" : undefined} href={projectDashboardHref(project)}>{project.displayName}</Link></th>
          <td><IndicatorLamp label={assessment.health} state={assessment.health === "nominal" ? "live" : assessment.health === "degraded" ? "warning" : "neutral"} /></td>
          {operationMetrics.map((metric) => <td key={metric}><strong>{format(assessment.readings[metric].value, metric)}</strong><small className="metric-freshness">{assessment.readings[metric].freshness}{assessment.readings[metric].source ? ` · ${assessment.readings[metric].source}` : ""}</small></td>)}</tr>)}</tbody>
      </table></div>}
    <p className="portfolio-calculation-note">Nominal requires current availability ≥ {DEFAULT_OPERATIONS_THRESHOLDS.availability}%, error rate ≤ {DEFAULT_OPERATIONS_THRESHOLDS.errorRate}%, and P95 latency ≤ {DEFAULT_OPERATIONS_THRESHOLDS.latency} ms. Readings older than 15 minutes become stale. Missing signals stay unknown.</p>
  </BrassPanel>;
}
