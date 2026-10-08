import React from "react";
import type { RenderReadout } from "../../lib/domain/render-deployments";

export function RenderServiceReadouts({ services }: { services: readonly RenderReadout[] }) {
  if (services.length === 0) return null;
  const live = services.filter(s => s.deployStatus === "live").length;
  const refreshed = services.filter(s => s.source === "render-api").length;
  return <section className="render-readouts" aria-labelledby="render-readouts-title">
    <header className="render-readouts-heading">
      <div><p className="eyebrow">Infrastructure · Verified provider records</p><h2 id="render-readouts-title">Deployed platforms</h2>
        <p>{live} of {services.length} services had a successful latest deployment. These are deployment results, not uptime or application-health measurements.</p></div>
      <div className="render-readouts-source" aria-label="Render API refresh status">{refreshed === services.length ? "Render API current" : refreshed > 0 ? `${refreshed} refreshed from Render API` : "Dated provider snapshot"}</div>
    </header>
    <div className="render-readouts-grid">
      {services.map(service => <article className="render-readout-card" key={service.id}>
        <div className="render-readout-line"><span className="render-readout-provider">RENDER</span>
          <span className={`render-readout-status ${service.deployStatus === "live" ? "is-live" : "is-warning"}`}>{service.deployStatus.replaceAll("_"," ")}</span>
        </div>
        <h3>{service.name}</h3>
        <p className="render-readout-repo">{service.repository}</p>
        <div className="render-readout-actions">
          <a href={service.website} target="_blank" rel="noopener noreferrer">Open website ↗</a>
          <a href={`https://github.com/${service.repository}`} target="_blank" rel="noopener noreferrer">Repository ↗</a>
        </div>
        <p className="render-readout-timestamp">Latest recorded: <time dateTime={service.lastObservedAt}>{service.lastObservedAt.slice(0,16).replace("T"," ")} UTC</time>
          <span>{service.source === "render-api" ? " · Provider API" : " · Snapshot, not refreshed"}</span></p>
      </article>)}
    </div>
    <p className="render-readouts-disclaimer">Provider-linked services may share a repository and represent previews. A past `live` deployment does not establish current reachability. Direct Render API updates require a server-side API key.</p>
  </section>;
}
