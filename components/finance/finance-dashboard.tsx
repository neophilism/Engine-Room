"use client";

import { orderProjectsByHierarchy, projectNameIndent } from "../../lib/domain/project-hierarchy";

import React, { useState } from "react";
import Link from "next/link";
import { currencies, formatMoney, summarizeProjectFinance, validFinancePeriod, type Currency, type FinanceOverview } from "../../lib/domain/finance";
import { BrassPanel, IndicatorLamp } from "../machine";
import { FinancialFlow } from "./financial-flow";

export function FinanceDashboard({ overview, initialPeriod }: { overview: FinanceOverview; initialPeriod: string }) {
  const [period, setPeriod] = useState(initialPeriod), [currency, setCurrency] = useState<Currency>("USD"), [environment, setEnvironment] = useState("production");
  const environments = [...new Set(["production", ...overview.entries.map((entry) => entry.environment), ...overview.forecasts.map((record) => record.environment)])].sort();
  const projects = orderProjectsByHierarchy(overview.projects).map((project) => ({ ...project, summary: summarizeProjectFinance(project.id, period, currency, environment, overview.entries, overview.forecasts) }));
  const total = (kind: "costMinor" | "revenueMinor") => projects.some((project) => project.summary[kind] !== null) ? projects.reduce((sum, project) => sum + BigInt(project.summary[kind] ?? "0"), BigInt(0)).toString() : null;
  return <BrassPanel title="Portfolio economics" eyebrow="Recorded actuals and forecasts">
    <div className="incident-controls"><label className="activity-filter">Accounting month<input type="month" value={period} onChange={(event) => { if (validFinancePeriod(event.target.value)) setPeriod(event.target.value); }} /></label>
      <label className="activity-filter">Currency<select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>{Object.keys(currencies).map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="activity-filter">Environment<select value={environment} onChange={(event) => setEnvironment(event.target.value)}>{environments.map((value) => <option key={value}>{value}</option>)}</select></label></div>
    <FinancialFlow overview={overview} period={period} currency={currency} environment={environment} />
    <div className="operational-summary"><div><span>Recorded cost total</span><strong>{formatMoney(total("costMinor"), currency)}</strong></div><div><span>Recorded revenue total</span><strong>{formatMoney(total("revenueMinor"), currency)}</strong></div></div>
    <p>Cost recorded for {projects.filter((project) => project.summary.costMinor !== null).length}/{projects.length} projects · Revenue recorded for {projects.filter((project) => project.summary.revenueMinor !== null).length}/{projects.length} projects</p>
    {overview.source === "error" ? <p>Financial data is unavailable. Refresh to try again.</p> : projects.length === 0 ? <p>No projects have been connected to finance yet.</p> : <div className="comparison-table-scroll" tabIndex={0} role="region" aria-label="Scrollable financial comparison"><table className="comparison-table">
      <caption>{period} · {currency} · {environment}</caption><thead><tr><th scope="col">Project</th><th scope="col">Actual cost</th><th scope="col">Actual revenue</th><th scope="col">Recorded net</th><th scope="col">Forecast cost</th><th scope="col">Forecast revenue</th><th scope="col">Coverage</th></tr></thead>
      <tbody>{projects.map((project) => <tr key={project.id}><th scope="row"><Link className={projectNameIndent(project, projects) > 0 ? "project-name-indent" : undefined} href={`/projects/${encodeURIComponent(project.slug)}`}>{project.displayName}</Link></th><td>{formatMoney(project.summary.costMinor, currency)}</td><td>{formatMoney(project.summary.revenueMinor, currency)}</td><td>{formatMoney(project.summary.netMinor, currency)}</td><td>{formatMoney(project.summary.forecast?.costMinor ?? null, currency)}</td><td>{formatMoney(project.summary.forecast?.revenueMinor ?? null, currency)}</td><td><IndicatorLamp label="Actuals coverage" state={project.summary.netMinor === null ? "neutral" : "active"} /><span>{project.summary.netMinor === null ? "Partial or missing actuals" : "Cost and revenue recorded"}</span>{project.summary.forecast && <small className="metric-freshness">Forecast: {project.summary.forecast.source} · {project.summary.forecast.observedAt.slice(0, 10)}</small>}</td></tr>)}</tbody>
    </table></div>}
    <p className="portfolio-calculation-note">Totals cover recorded entries in this currency and month. Missing cost or revenue stays unknown. Forecasts are separate estimates; currencies are never combined or converted.</p>
  </BrassPanel>;
}
