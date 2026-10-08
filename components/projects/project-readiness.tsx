import React from "react";
import type { ProjectReadiness } from "../../lib/domain/project-readiness";
import { BrassPanel, IndicatorLamp } from "../machine";

function evidenceLink(value: string | undefined) {
  try { const url = new URL(value ?? ""); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}

export function ProjectReadinessPanel({ readiness }: { readiness: ProjectReadiness }) {
  return <BrassPanel title="Risks & release readiness" eyebrow="Evidence for the selected release"
    status={<IndicatorLamp label={`Release ${readiness.status.replaceAll("-", " ")}`} state={readiness.status === "ready" ? "complete" : readiness.status === "blocked" ? "blocked" : "neutral"} />}>
    <p>{readiness.target ? `${readiness.target.environment} · ${readiness.target.commitSha.slice(0, 12)}` : "No release target has been selected."}</p>
    <ul className="release-gates">{readiness.gates.map((gate) => <li key={gate.gate} data-gate-state={gate.status}><strong>{gate.gate.replaceAll("-", " ")}</strong>
      <span>{gate.status}</span>{evidenceLink(gate.evidenceUrl) && <a href={evidenceLink(gate.evidenceUrl)} target="_blank" rel="noopener noreferrer">Evidence ↗</a>}</li>)}</ul>
    <div className="project-readiness-columns"><section aria-label="Open risks"><h3>Open risks</h3>
      {readiness.risks.length > 0 ? <ul>{readiness.risks.map((risk) => <li key={risk.key}><strong>{risk.title}</strong> · {risk.severity}{risk.blocking ? " · blocking" : ""}</li>)}</ul> : <p>No open risks have been recorded.</p>}</section>
      <section aria-label="Next actions"><h3>Next actions</h3>{readiness.nextActions.length > 0 ? <ol>{readiness.nextActions.map((action) => <li key={action}>{action}</li>)}</ol> : <p>All required release evidence is current.</p>}</section></div>
    <p className="portfolio-calculation-note">Missing, expired, or different-release evidence remains unknown. Roadmap completion alone does not establish production readiness.</p>
  </BrassPanel>;
}
