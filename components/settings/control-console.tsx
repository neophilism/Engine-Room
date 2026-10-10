"use client";
import React, { useState } from "react";
import { reconciliationIntervals, type ControlSettings } from "../../lib/domain/control-settings";

type Snapshot = {
  revision: number;
  settings: ControlSettings;
  integration: Record<string, boolean>;
  audit: { revision: number; actor: string; changedAt: string }[];
  reconciliationRuns: { installationId: string; status: string; startedAt: string }[];
  repositorySync?:{fullName:string;lastSuccessAt:string|null;lastError:string|null}[];
};

export function ControlConsole() {
  const [token, setToken] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [interval, setInterval] = useState(60);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(path: string, method: string, body?: unknown) {
    const response = await fetch(path, {
      method,
      headers: { ...(token?{Authorization: `Bearer ${token}`} : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }

  async function load() {
    setBusy(true); setNotice("");
    try {
      const value = await request("/api/admin/settings", "GET") as Snapshot;
      setSnapshot(value);
      setEnabled(value.settings.githubReconciliationEnabled);
      setInterval(value.settings.githubReconciliationIntervalMinutes);
      setNotice("Administrative settings loaded.");
    } catch (error) { setSnapshot(null); setNotice(error instanceof Error ? error.message : "Settings unavailable."); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!snapshot) return;
    setBusy(true); setNotice("");
    try {
      await request("/api/admin/settings", "PUT", {
        expectedRevision: snapshot.revision,
        settings: { githubReconciliationEnabled: enabled, githubReconciliationIntervalMinutes: interval }
      });
      const value = await request("/api/admin/settings", "GET") as Snapshot;
      setSnapshot(value);
      setNotice("Settings saved to PostgreSQL and added to the audit trail.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Save failed."); }
    finally { setBusy(false); }
  }

  async function synchronize() {
    if (!snapshot) return;
    setBusy(true); setNotice("");
    try {
      const outcome = await request("/api/admin/reconcile", "POST", { mode: "manual" });
      setNotice(['succeeded','partial'].includes(outcome.status)
        ? `Synchronized ${outcome.repositories} repositories. ${outcome.failed||0} source errors; failed sources will retry.`
        : outcome.status==='disabled'?'Reconciliation is paused. Enable it to synchronize.':outcome.status==='rate-limited'?'GitHub rate limit reached. Automatic retry is scheduled.':"Reconciliation did not execute.");
      setSnapshot(await request("/api/admin/settings", "GET") as Snapshot);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Reconciliation failed."); }
    finally { setBusy(false); }
  }

  return <section className="panel" aria-label="Engine Room administration">
    <h2>Administration console</h2>
    <p>Your registered administrator account authorizes these controls. An optional server token can be used for scheduler administration.</p>
    <div className="incident-controls">
      <label className="activity-filter">Optional scheduler token <input aria-label="Administrator token" type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} /></label>
      <button disabled={busy} type="button" onClick={load}>Load controls</button>
      <button type="button" onClick={() => { setToken(""); setSnapshot(null); setNotice("Credentials cleared."); }}>Clear credentials</button>
    </div>
    {notice && <p role="status">{notice}</p>}
    {snapshot && <>
      <h3>Integration readiness</h3>
      <ul>{Object.entries(snapshot.integration).map(([key, value]) => <li key={key}>{key}: {value ? "Configured" : "Not configured"}</li>)}</ul>
      <p>Configured means environment variables are present, not that the provider connection has been verified.</p>
      <h3>GitHub reconciliation</h3>
      <label><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> Enable scheduled reconciliation</label>
      <label className="activity-filter">Minimum interval (minutes)
        <select value={interval} onChange={e => setInterval(Number(e.target.value))}>
          {reconciliationIntervals.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <p>The built-in worker reconciles while the existing service is awake. Anonymous GitHub access uses a minimum 120-minute interval. Configure GitHub read credentials for the selected faster interval.</p>
      <div className="incident-controls">
        <button disabled={busy} type="button" onClick={save}>Save settings</button>
        <button disabled={busy} type="button" onClick={synchronize}>Synchronize now</button>
      </div>
      <h3>Recent changes</h3>
      {snapshot.audit.length ? <ul>{snapshot.audit.map(change => <li key={change.revision}>Revision {change.revision} · {change.changedAt} · {change.actor}</li>)}</ul> : <p>No setting changes recorded.</p>}
      <h3>Repository checkpoints</h3>
      {snapshot.repositorySync?.length?<ul>{snapshot.repositorySync.map(row=><li key={row.fullName}>{row.fullName}: {row.lastError||'Last success '+(row.lastSuccessAt||'N/A')}</li>)}</ul>:<p>Initial repository synchronization pending.</p>}
      <h3>Previous installation reconciliation runs</h3>
      {snapshot.reconciliationRuns.length ? <ul>{snapshot.reconciliationRuns.map(run => <li key={run.installationId}>{run.installationId}: {run.status} · {run.startedAt}</li>)}</ul> : <p>No reconciliation runs recorded.</p>}
    </>}
  </section>;
}
