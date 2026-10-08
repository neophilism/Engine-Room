import { orderProjectsByHierarchy, projectNameIndent } from "../../lib/domain/project-hierarchy";
"use client";

import React, { useEffect, useState } from "react";
import type { RenderReadout, PublicSiteObservation } from "../../lib/domain/render-deployments";

export function RenderServiceReadouts({ services }: { services: readonly RenderReadout[] }) {
  const [observations, setObservations] = useState<Record<string, PublicSiteObservation>>({});
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/public-sites", { cache: "no-store" });
        if (!response.ok) return;
        const payload: { observations?: PublicSiteObservation[] } = await response.json();
        if (active && Array.isArray(payload.observations)) {
          setObservations(Object.fromEntries(payload.observations.map(item => [item.serviceId, item])));
        }
      } catch {
        // A failed probe request does not establish an outage for any platform.
      }
    };
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 10 * 60 * 1000);
    return () => { active = false; clearInterval(interval); };
  }, []);
  if (services.length === 0) return null;
  const live = services.filter(s => s.deployStatus === "live").length;
  const refreshed = services.filter(s => s.source === "render-api").length;
  const orderedServices = orderProjectsByHierarchy(services.map(service => ({ ...service, displayName: service.name, repositoryFullName: service.repository })));
  return <section className="render-readouts" aria-labelledby="render-readouts-title">
    <header className="render-readouts-heading">
      <div><p className="eyebrow">Infrastructure · Verified provider records</p><h2 id="render-readouts-title">Deployed platforms</h2>
        <p>{live} of {services.length} services had a successful latest deployment. These are deployment results, not uptime or application-health measurements.</p></div>
      <div className="render-readouts-source" aria-label="Render API refresh status">{refreshed === services.length ? "Render API current" : refreshed > 0 ? `${refreshed} refreshed from Render API` : "Dated provider snapshot"}</div>
    </header>
    <div className="render-readouts-grid">
      {orderedServices.map(service => <article className="render-readout-card" key={service.id}>
        <div className="render-readout-line"><span className="render-readout-provider">RENDER</span>
          <span className={`render-readout-status ${service.deployStatus === "live" ? "is-live" : "is-warning"}`}>{service.deployStatus.replaceAll("_"," ")}</span>
        </div>
        <h3><span className={projectNameIndent(service, orderedServices) > 0 ? "project-name-indent" : undefined}>{service.name}</span></h3>
        <p className="render-readout-repo">{service.repository}</p>
        <div className="render-readout-actions">
          <a href={service.website} target="_blank" rel="noopener noreferrer">Open website ↗</a>
          <a href={`https://github.com/${service.repository}`} target="_blank" rel="noopener noreferrer">Repository ↗</a>
        </div>
        <p className="render-readout-timestamp">
          {observations[service.id]
            ? observations[service.id].observation === "http-response"
              ? `Public-site check: HTTP ${observations[service.id].httpStatus} at ${observations[service.id].checkedAt.slice(0,16).replace("T"," ")} UTC`
              : `Public-site check: no response within probe timeout at ${observations[service.id].checkedAt.slice(0,16).replace("T"," ")} UTC`
            : "Public-site check: pending or unavailable"}
        </p>
        <p className="render-readout-timestamp">Latest recorded: <time dateTime={service.lastObservedAt}>{service.lastObservedAt.slice(0,16).replace("T"," ")} UTC</time>
          <span>{service.source === "render-api" ? " · Provider API" : " · Snapshot, not refreshed"}</span></p>
      </article>)}
    </div>
    <p className="render-readouts-disclaimer">Provider-linked services may share a repository and represent previews. A past `live` deployment does not establish current reachability. HTTP responses measure only public website response, not full application health; a timeout may mean a sleeping service. Direct Render API updates require a server-side API key.</p>
  </section>;
}
