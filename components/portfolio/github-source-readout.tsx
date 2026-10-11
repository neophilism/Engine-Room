"use client";
import React, { useEffect, useState } from "react";
import type { PublicGitHubStatus } from "../../lib/server/public-github-status";

export function GitHubSourceReadout() {
  const [status, setStatus] = useState<PublicGitHubStatus | null>(null);
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/public-github-status", { cache: "no-store" });
        if (!response.ok) return;
        const data: PublicGitHubStatus = await response.json();
        if (mounted) setStatus(data);
      } catch { if (mounted) setStatus(null); }
    };
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 5 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);
  const observed = status?.source === "database" && status.mostRecentObservation;
  return <section className="panel" style={{marginBottom:20}} aria-label="GitHub source observation status">
    <div className="section-heading">
      <div><p className="eyebrow">Source provenance</p><h2>GitHub data connection</h2></div>
      <a href="https://github.com/neophilism" target="_blank" rel="noopener noreferrer">GitHub portfolio ↗</a>
    </div>
    {status?.source === "database" ? <>
      <p>Observed public repositories: <strong>{status.repositoryCount}</strong> · Imported PR records: <strong>{status.pullRequestCount}</strong> · Recorded merges: <strong>{status.mergedPullRequestCount}</strong></p>
      <p className="metric-freshness" aria-live="polite">
        {observed ? `Latest stored PR observation: ${status.mostRecentObservation?.slice(0,16).replace("T"," ")} UTC` : "No stored PR refresh observed yet."}
      </p>
    </> : <p aria-live="polite">GitHub import status {status ? status.source === "error" ? "unavailable from database" : "not configured" : "loading or unavailable"}.</p>}
    {!!status?.repositories?.length && <details>
      <summary>Repository synchronization diagnostics ({status.repositories.length})</summary>
      <div className="monitor-table-wrap">
        <table className="monitor-table" aria-label="GitHub repository synchronization diagnostics">
          <thead><tr><th>Repository</th><th>Merged PRs</th><th>GitHub PR sync</th><th>Plan source</th></tr></thead>
          <tbody>{status.repositories.map(repo => {
            const old=repo.lastSuccessAt ? Date.now()-Date.parse(repo.lastSuccessAt)>25*60*1000 : true;
            const state=repo.error || (old ? "Stale" : "Current");
            return <tr key={repo.name}>
              <td><a href={"https://github.com/neophilism/"+repo.name} target="_blank" rel="noopener noreferrer">{repo.name}</a></td>
              <td>{repo.merged}/{repo.total}</td>
              <td>{state}<small>{repo.lastSuccessAt ? new Date(repo.lastSuccessAt).toLocaleString() : "Never synced"}</small></td>
              <td>{repo.planSource==="repository" ? "Live repository" :
                repo.planSource==="bundled" ? "Historical fallback" : "No import"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p className="metric-freshness">A fresh GitHub PR count and a fresh approved roadmap import are separate checks. An old saved snapshot does not certify a successful live plan import.</p>
    </details>
    <p className="metric-freshness">PR records and actual merge timestamps are evidence; a recent record does not prove that every repository completed a fresh synchronization.</p>
  </section>;
}
