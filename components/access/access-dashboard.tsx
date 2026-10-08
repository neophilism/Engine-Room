"use client";

import React, { useState } from "react";
import Link from "next/link";
import { accessFreshness, principalStatuses, summarizeAccess, type AccessOverview } from "../../lib/domain/access";
import { BrassPanel } from "../machine";

export function AccessDashboard({ overview, evaluatedAt }: { overview: AccessOverview; evaluatedAt: string }) {
  const [query, setQuery] = useState(""), [projectId, setProjectId] = useState("all"), [status, setStatus] = useState("all"), [environment, setEnvironment] = useState("production");
  const projects = [...new Map(overview.principals.map((record) => [record.projectId, record.projectName])).entries()].sort((a,b) => a[1].localeCompare(b[1]));
  const environments = [...new Set(["production", ...overview.principals.map((record) => record.environment)])].sort();
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const principals = overview.principals.filter((record) => record.environment === environment && (projectId === "all" || record.projectId === projectId) && (status === "all" || record.status === status) && terms.every((term) => [record.displayName, record.principalId, record.organizationName ?? "", ...record.roles].join(" ").toLowerCase().includes(term)));
  const summary = summarizeAccess(principals, new Date(evaluatedAt));
  return <BrassPanel title="Users & Access" eyebrow="Recorded identities and grants">
    <div className="incident-controls"><label className="activity-filter">Search identities<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className="activity-filter">Access project<select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="all">All projects</option>{projects.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="activity-filter">Identity status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All states</option>{principalStatuses.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="activity-filter">Access environment<select value={environment} onChange={(event) => setEnvironment(event.target.value)}>{environments.map((value) => <option key={value}>{value}</option>)}</select></label></div>
    {overview.source === "database" && <p>{summary.active} active grants · {summary.privileged} privileged · {summary.services} service identities · {summary.mfaDisabled} people with MFA disabled · {summary.mfaUnknown} MFA unknown · {summary.stale} stale or unknown observations</p>}
    {principals.length === 0 ? <p>{overview.source === "error" ? "Access data is unavailable." : overview.source === "unconfigured" ? "Connect an identity source to measure access." : "No identities match this view."}</p> : <div className="comparison-table-scroll" role="region" tabIndex={0} aria-label="Scrollable access roster"><table className="comparison-table">
      <caption>Latest recorded grants · {environment}</caption><thead><tr><th scope="col">Identity</th><th scope="col">Project</th><th scope="col">Organization</th><th scope="col">Roles</th><th scope="col">Status</th><th scope="col">MFA / credentials</th><th scope="col">Source</th></tr></thead>
      <tbody>{principals.map((record) => <tr key={`${record.projectId}/${record.environment}/${record.source}/${record.principalId}`}><th scope="row">{record.displayName}<small className="metric-freshness">{record.principalKind} · {record.principalId}</small></th><td><Link href={`/projects/${encodeURIComponent(record.projectSlug)}`}>{record.projectName}</Link></td><td>{record.organizationName ?? "Unassigned"}</td><td>{record.roles.join(", ") || "No roles"}{record.privileged && <small className="metric-freshness">Privileged access</small>}</td><td>{record.status}</td><td>{record.principalKind === "service" ? record.credentialExpiresAt ? `Expires ${record.credentialExpiresAt.slice(0,10)}` : "Expiry unknown" : record.mfaEnabled === null ? "MFA unknown" : record.mfaEnabled ? "MFA enabled" : "MFA disabled"}</td><td>{record.source}<small className="metric-freshness">{accessFreshness(record, new Date(evaluatedAt))} · {record.observedAt.slice(0,10)}</small></td></tr>)}</tbody>
    </table></div>}
    <p className="portfolio-calculation-note">Grants are source records, not inferred active users. Missing source data and MFA remain unknown. Deletion or suspension requires an explicit observation; absence from a batch does not revoke access.</p>
  </BrassPanel>;
}
