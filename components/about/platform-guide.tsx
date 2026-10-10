import React from "react";
import Link from "next/link";

const stations = [
  { name: "Portfolio", route: "/", kind: "STRATEGY", description: "Every registered project, approved roadmap, and the weighted progress machine in one view.", input: "Approved roadmap mappings + merged GitHub pull requests" },
  { name: "Projects", route: "/projects", kind: "DELIVERY", description: "Compare individual project progress, feature status, milestones, risks, and recorded engineering activity.", input: "Repository synchronization + project release evidence" },
  { name: "Operations", route: "/operations", kind: "SYSTEMS", description: "Read measured capacity, health and performance records with source timestamps and environment scope.", input: "Signed telemetry and operational samples" },
  { name: "Releases", route: "/releases", kind: "SHIPPING", description: "Follow audited build, verification, approval, and deployment transitions without skipping gates.", input: "Immutable release events and verified evidence" },
  { name: "Alerts", route: "/alerts", kind: "INCIDENTS", description: "Investigate incidents from detection through acknowledgement, mitigation and resolution.", input: "Signed incident observations and response events" },
  { name: "Finance", route: "/finance", kind: "ECONOMICS", description: "Explore recorded cost, revenue and forecasts without mixing currencies or inventing transactions.", input: "Authorized financial observations" },
  { name: "Users", route: "/users", kind: "ACCESS", description: "Compare identity grants, organizations, roles, MFA uncertainty, and stale access observations.", input: "Source-scoped access observations" },
  { name: "Settings", route: "/settings", kind: "CONTROL", description: "Manage auditable synchronization policies and inspect which external integrations are configured.", input: "Authenticated administration and runtime configuration" }
] as const;

const steps = [
  ["01", "Connect a source", "Configure the GitHub installation, database, and any optional signed provider adapters in the trusted server environment."],
  ["02", "Register a project", "An approved .exechub/project.yml manifest establishes the versioned roadmap. Repositories without approved plans can be discovered without manufactured completion percentages."],
  ["03", "Match evidence", "Map planned work to real repository PR numbers. A PR counts as complete only when its matching GitHub record has a verified merge timestamp."],
  ["04", "Observe delivery", "Providers submit scope-bound operational, release, finance, and access observations. Time, source, environment, and unknown states are preserved."],
  ["05", "Review readiness", "Risks and release evidence are considered separately from roadmap completion. Unobserved deployments remain unverified, not green."]
] as const;

export function PlatformGuide() {
  return <main className="content about-content" id="main-content">
    <header className="hero about-hero">
      <p className="eyebrow">Welcome aboard · System navigator</p>
      <h1>The Engine Room</h1>
      <p>An executive command deck for the machinery behind every software project. Inspect what has been built, what is running, which evidence can be trusted, and what remains to ship.</p>
      <div className="about-hero-actions">
        <Link className="about-action-primary" href="/">Enter Portfolio <span aria-hidden="true">→</span></Link>
        <Link className="about-action-secondary" href="/projects">Compare projects</Link>
      </div>
    </header>

    <section className="about-machine-panel" aria-labelledby="about-machine-title">
      <div className="about-machine-heading"><div><p className="eyebrow">01 / System architecture</p><h2 id="about-machine-title">A live system, not a slide deck</h2></div><span className="about-machine-trace" aria-hidden="true" /></div>
      <div className="about-system-diagram" role="img" aria-label="External sources feed a normalized database, which powers portfolio and operational dashboard readouts.">
        <div className="about-machine-node"><small>INPUT</small><strong>GitHub &amp; external providers</strong><span>Authenticated source records</span></div>
        <span className="about-machine-pipe" aria-hidden="true">→</span>
        <div className="about-machine-node about-machine-core"><small>CORE</small><strong>Engine Room data bus</strong><span>Normalized, attributable observations</span></div>
        <span className="about-machine-pipe" aria-hidden="true">→</span>
        <div className="about-machine-node"><small>READOUT</small><strong>Portfolio + operations</strong><span>Decision-grade visibility</span></div>
      </div>
      <p className="about-machine-footnote">Data is separated by source, project and environment. A missing source is never silently treated as a healthy or completed system.</p>
    </section>

    <section className="about-stations" aria-labelledby="about-stations-title">
      <header className="about-section-heading"><p className="eyebrow">02 / Navigation directory</p><h2 id="about-stations-title">Eight control stations</h2><p>Each dial leads to an actual dashboard. Instrument readings come from declared data sources, rather than an illustration.</p></header>
      <div className="about-station-grid">{stations.map((station, index) =>
        <article className="about-station-card" key={station.route}>
          <span className="about-station-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>
          <span className="about-station-kind">{station.kind}</span>
          <h3>{station.name}</h3><p>{station.description}</p><small>DATA INPUT · {station.input}</small>
          <Link href={station.route} aria-label={`Open ${station.name} dashboard`}>Open station <span aria-hidden="true">↗</span></Link>
        </article>
      )}</div>
    </section>

    <section className="panel about-how-it-works" aria-labelledby="about-process-title">
      <header className="about-section-heading"><p className="eyebrow">03 / From intent to evidence</p><h2 id="about-process-title">How the machinery works</h2></header>
      <ol className="about-process">{steps.map(([index, title, detail]) =>
        <li key={index}><span className="about-process-step" aria-hidden="true">{index}</span><div><h3>{title}</h3><p>{detail}</p></div></li>
      )}</ol>
    </section>

    <section className="about-facts" aria-labelledby="about-meaning-title">
      <header className="about-section-heading"><p className="eyebrow">04 / Instrument glossary</p><h2 id="about-meaning-title">What the numbers mean</h2></header>
      <div className="about-fact-grid">
        <div className="panel"><h3>Roadmap progress</h3><p><strong>Merged mapped PRs / approved planned PR total.</strong> An open PR, an unrelated PR, and an unmapped PR do not raise this percentage.</p></div>
        <div className="panel"><h3>Total portfolio progress</h3><p><strong>Sum of completed mapped PRs / sum of planned PRs.</strong> This is weighted by approved roadmap size, not an unweighted mean of project percentages.</p></div>
        <div className="panel"><h3>Operational health</h3><p><strong>Observed signals only.</strong> Successful deployment, HTTP reachability, and measured reliability are distinct facts. A stale or missing signal does not mean healthy.</p></div>
        <div className="panel"><h3>Release readiness</h3><p><strong>Evidence plus open blockers.</strong> Release approval is independent of roadmap completion. Unknown, expired or failed gates cannot count as passed.</p></div>
        <div className="panel"><h3>Identity and usage</h3><p><strong>Recorded identities are not automatically active users.</strong> Access grants, MFA state and usage are attributed to their providers and timestamps.</p></div>
        <div className="panel"><h3>Money and forecasts</h3><p><strong>Observed records, separate currencies.</strong> Actual costs, recognized revenue and future forecasts are different quantities; currency conversions are not assumed.</p></div>
      </div>
    </section>

    <section className="panel about-signal-guide" aria-labelledby="about-states-title">
      <header className="about-section-heading"><p className="eyebrow">05 / Reading machine states</p><h2 id="about-states-title">When a lamp illuminates</h2></header>
      <dl className="about-state-list">
        <div><dt><span className="about-state-dot about-state-complete" aria-hidden="true"/>Complete</dt><dd>Verified evidence satisfies that specific requirement.</dd></div>
        <div><dt><span className="about-state-dot about-state-active" aria-hidden="true"/>Active</dt><dd>Recorded work is underway; it is not complete.</dd></div>
        <div><dt><span className="about-state-dot about-state-warning" aria-hidden="true"/>Attention</dt><dd>Some source data, freshness or prerequisites need review.</dd></div>
        <div><dt><span className="about-state-dot about-state-blocked" aria-hidden="true"/>Blocked</dt><dd>A known failing gate or blocker prevents advancing safely.</dd></div>
        <div><dt><span className="about-state-dot about-state-unknown" aria-hidden="true"/>Unknown</dt><dd>No trustworthy recent observation is available.</dd></div>
      </dl>
    </section>

    <section className="about-last-call">
      <div><p className="eyebrow">Ready to navigate?</p><h2>Every project has a story. Start with the evidence.</h2><p>Explore the live portfolio, follow your projects into their engineering records, then move from build status to operational reality.</p></div>
      <Link className="about-action-primary" href="/">Open command deck →</Link>
    </section>
    <footer className="about-footer">Engine Room · Audit-friendly portfolio navigation · <Link href="/settings">Integration controls</Link></footer>
  </main>;
}
