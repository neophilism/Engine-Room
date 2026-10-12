"use client";
import React, { useEffect, useState } from "react";
import type { PublicGitHubStatus } from "../../lib/server/public-github-status";

export const SOURCE_STATUS_REFRESH_MS = 30_000;

export function GitHubSourceReadout() {
  const [status, setStatus] = useState<PublicGitHubStatus | null>(null);
  useEffect(() => {
    let mounted = true;
    let loading = false;
    let queued = false;
    const refresh = async () => {
      if (loading) {
        queued = true;
        return;
      }
      loading = true;
      do {
        queued = false;
        try {
          const response = await fetch("/api/public-github-status", { cache: "no-store" });
          if (!response.ok) throw new Error("GitHub health unavailable");
          const data: PublicGitHubStatus = await response.json();
          if (mounted) setStatus(data);
        } catch {
          // Never keep displaying a previously successful status as current when
          // the actual health endpoint has failed or the admin session expired.
          if (mounted) setStatus(null);
        }
      } while (mounted && queued);
      loading = false;
    };
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    // Background PR reconciliation increments the portfolio revision; react to
    // that event instead of leaving client state frozen for five minutes.
    window.addEventListener("engine-room-data-changed", refreshIfVisible);
    window.addEventListener("engine-room-github-sync-complete", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    const interval = window.setInterval(refreshIfVisible, SOURCE_STATUS_REFRESH_MS);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("engine-room-data-changed", refreshIfVisible);
      window.removeEventListener("engine-room-github-sync-complete", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, []);
  const observed = status?.source === "database" && status.mostRecentObservation;
  const repositories = status?.repositories ?? [];
  const failures = repositories.filter(repo => Boolean(repo.error));
  const fresh = repositories.filter(repo => !repo.error && repo.lastSuccessAt &&
    Date.now() - Date.parse(repo.lastSuccessAt) < 25 * 60_000).length;
  const denied = failures.filter(repo => repo.error?.includes("HTTP 404") || repo.error?.includes("HTTP 403")).length;
  const ordered = [...repositories].sort((a, b) =>
    Number(Boolean(b.error)) - Number(Boolean(a.error)) || a.name.localeCompare(b.name));
  return <section className="panel" style={{marginBottom:20}} aria-label="GitHub source observation status">
    <div className="section-heading">
      <div><p className="eyebrow">Source provenance</p><h2>GitHub data connection</h2></div>
      <a href="https://github.com/neophilism" target="_blank" rel="noopener noreferrer">GitHub portfolio ↗</a>
    </div>
    {status?.source === "database" ? <>
      {repositories.length > 0 && <p role="status" className="metric-freshness">
        <strong>{fresh} of {repositories.length} repositories synchronized recently.</strong>
        {failures.length > 0 ? ` ${failures.length} have synchronization errors; their counts may be historical.` : " No repository synchronization errors are recorded."}
      </p>}
      {denied > 0 && <p className="metric-freshness">
        <strong>{denied} repositories are inaccessible to Engine Room&apos;s current GitHub credential.</strong>
        {" "}For private repository monitoring, update the existing <code>GITHUB_READ_TOKEN</code> in Render
        using a GitHub token authorized for the repositories, with read-only Contents and Pull requests
        permissions (and Metadata read access). The token must also have access to the private repositories
        in its repository selection. Never paste the token into Engine Room or chat.
        {" "}<a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener noreferrer">Review GitHub token access ↗</a>
      </p>}
      <p>Tracked repositories: <strong>{status.repositoryCount}</strong> · Imported PR records: <strong>{status.pullRequestCount}</strong> · Recorded merges: <strong>{status.mergedPullRequestCount}</strong></p>
      <p className="metric-freshness" aria-live="polite">
        {status.githubCredentialConfigured===false ? "GitHub read credentials are not configured for private repositories; private PR counts may be historical. " : ""}
        {observed ? `Latest stored PR observation: ${status.mostRecentObservation?.slice(0,16).replace("T"," ")} UTC` : "No stored PR refresh observed yet."}
      </p>
    </> : <p aria-live="polite">GitHub import status {status ? status.source === "error" ? "unavailable from database" : "not configured" : "loading or unavailable"}.</p>}
    {!!status?.repositories?.length && <details>
      <summary>Repository synchronization diagnostics ({status.repositories.length})</summary>
      <div className="monitor-table-wrap">
        <table className="monitor-table" aria-label="GitHub repository synchronization diagnostics">
          <thead><tr><th>Repository</th><th>Access</th><th>Merged PRs</th><th>GitHub PR sync</th><th>Plan source</th></tr></thead>
          <tbody>{ordered.map(repo => {
            const old=repo.lastSuccessAt ? Date.now()-Date.parse(repo.lastSuccessAt)>25*60*1000 : true;
            const state=repo.error || (old ? "Stale" : "Current");
            return <tr key={repo.name}>
              <td><a href={"https://github.com/neophilism/"+repo.name} target="_blank" rel="noopener noreferrer">{repo.name}</a></td>
              <td>{repo.visibility === "private" ? "Private" : repo.error?.includes("HTTP 404") ? "Access unknown (404)" : "Public"}</td>
              <td>{repo.merged}/{repo.total}</td>
              <td>{state}<small>{repo.lastSuccessAt ? new Date(repo.lastSuccessAt).toLocaleString() : "Never synced"}</small></td>
              <td>{repo.planSource==="repository" ? "Live repository" :
                repo.planSource==="bundled" ? "Historical fallback" : "No import"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p className="metric-freshness">A fresh GitHub PR count and a fresh approved roadmap import are separate checks. An old saved snapshot does not certify a successful live plan import.</p>
    </details>}
    <p className="metric-freshness">PR records and actual merge timestamps are evidence; a recent record does not prove that every repository completed a fresh synchronization.</p>
  </section>;
}
