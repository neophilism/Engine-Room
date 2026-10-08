import React from "react";
import Link from "next/link";
import { platformDefinitions, platformSections } from "../../lib/domain/platform-guide";
import { BrassPanel } from "../machine";

export function PlatformGuide() {
  return <div className="project-dashboard-grid">
    <BrassPanel title="Explore the control room" eyebrow="Navigation & functions">
      <ol>{platformSections.map(item => <li key={item.path}>
        <strong><Link href={item.path}>{item.title}</Link></strong>
        <p>{item.description}</p>
      </li>)}</ol>
    </BrassPanel>
    <BrassPanel title="What each instrument measures" eyebrow="Metric glossary">
      <dl>{platformDefinitions.map(item => <div key={item.label} style={{marginBottom:18}}>
        <dt><strong>{item.label}</strong></dt><dd style={{margin:0}}>{item.meaning}</dd>
      </div>)}</dl>
    </BrassPanel>
    <BrassPanel title="From plan to production" eyebrow="Suggested operating sequence">
      <ol>
        <li>Register an approved project manifest in its repository and map planned PR numbers.</li>
        <li>Configure the GitHub App installation, webhook signing, and reconciliation scheduler.</li>
        <li>Verify calculated development progress against the canonical GitHub PRs.</li>
        <li>Connect scoped operations, access, and finance feeds; check observation freshness.</li>
        <li>Record release readiness evidence for the intended commit and environment.</li>
        <li>Deploy with verified security, rollback, monitoring, and backups.</li>
      </ol>
    </BrassPanel>
    <BrassPanel title="Read the instruments correctly" eyebrow="Evidence rules">
      <p>Engine Room reports evidence, not assumptions. A connected setting does not prove that a feed is working. An unconfigured source is not a zero-valued measurement.</p>
      <p>Roadmap completion is not equivalent to a deployed production service. Stale or unknown observations stay labeled accordingly.</p>
      <p>For administration, use <Link href="/settings">Settings</Link>. Do not paste GitHub private keys, database credentials, or provider secrets into public issue comments.</p>
    </BrassPanel>
  </div>;
}
