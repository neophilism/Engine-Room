"use client";

import React, { useState } from "react";
import { buildAccessAnalytics } from "../../lib/domain/access-analytics";
import type { AccessOverview } from "../../lib/domain/access";
import { BrassPanel } from "../machine";

export function AccessAnalytics({ overview, evaluatedAt }: { overview: AccessOverview; evaluatedAt: string }) {
  const [environment, setEnvironment] = useState("production");
  const environments = [...new Set(["production", ...overview.principals.map((record) => record.environment)])].sort();
  const data = buildAccessAnalytics(overview.principals, environment, new Date(evaluatedAt));
  return <BrassPanel title="Access analytics" eyebrow="Cross-project identities and security signals">
    <label className="activity-filter">Analytics environment<select value={environment} onChange={(event) => setEnvironment(event.target.value)}>{environments.map((value) => <option key={value}>{value}</option>)}</select></label>
    {overview.source === "database" ? <><div className="operational-summary"><div><span>Unique recorded identities</span><strong>{data.uniqueIdentities}</strong></div><div><span>Active project grants</span><strong>{data.activeGrants}</strong></div><div><span>Observed projects</span><strong>{data.observedProjects}/{overview.projects?.length ?? data.observedProjects}</strong></div></div>
      <div className="access-analytics-grid"><section><h3>Source identities</h3><ul>{data.identities.map((identity) => <li key={identity.id}><strong>{identity.name}</strong> · {identity.source} · {identity.principalKind} · {identity.projects} projects · {identity.privilegedProjects} with current privileged grants</li>)}</ul>{data.identities.length === 0 && <p>No active identities recorded.</p>}</section>
        <section><h3>Organizations</h3><ul>{data.organizations.map((organization) => <li key={organization.id}><strong>{organization.name}</strong> · {organization.source} · {organization.principals} identities · {organization.projects} projects</li>)}</ul>{data.organizations.length === 0 && <p>No organizations recorded.</p>}</section>
        <section><h3>Reported roles</h3><ul>{data.roles.map((role) => <li key={role.source + "/" + role.role}>{role.source} / <strong>{role.role}</strong> · {role.grants} project grants</li>)}</ul>{data.roles.length === 0 && <p>No active role grants recorded.</p>}</section></div>
      <h3>Access review findings</h3>{data.findings.length === 0 ? <p>No findings in the recorded observations. Feed coverage and unknown source fields still require review.</p> : <ul className="access-findings">{data.findings.map((finding) => <li key={finding.id} data-severity={finding.severity}><strong>{finding.title}</strong><span>{finding.severity} · {finding.principalName} · {finding.projectName}</span><p>{finding.action}</p></li>)}</ul>}
    </> : <p>{overview.source === "error" ? "Access analytics are unavailable." : "Connect identity sources to assess cross-project access."}</p>}
    <p className="portfolio-calculation-note">Identity and organization IDs are joined only within the same source authority. Shared display names never establish identity. Findings prompt source review; they do not change grants or certify compliance.</p>
  </BrassPanel>;
}
