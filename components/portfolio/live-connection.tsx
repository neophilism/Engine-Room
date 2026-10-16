"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LiveSnapshot } from "../../lib/domain/live-monitor";

type SynchronizationOutcome = {
  status?: "succeeded" | "partial" | "disabled" | "rate-limited";
  repositories?: number;
  failed?: number;
  metadataFailures?: number;
  activityFailures?: number;
  securityFailures?: number;
  processed?: number;
  error?: string;
  rateLimitResetAt?: string | null;
  structured?: {imported:number;failed:number;registered?:number;fromSnapshot:number;fromRepository:number;prObservations:number;inferredByExactId?:number;};
};

type SyncFeedback = { kind: "success" | "warning" | "error"; message: string };
export const SYNC_FEEDBACK_MS = 10_000;

function describeSynchronization(outcome: SynchronizationOutcome): SyncFeedback {
  const synced = Number(outcome.repositories || 0);
  const failed = Number(outcome.failed || 0);
  const planned = outcome.structured;
  const saved = planned?.imported || 0;
  const metadataErrors=(outcome.metadataFailures||0)+(outcome.activityFailures||0)+(outcome.securityFailures||0);
  const detail = (saved > 0 ? " Approved plans: "+saved+" processed ("+(planned?.fromRepository||0)+" live repository files; "+(planned?.fromSnapshot||0)+" historical fallbacks; "+(planned?.inferredByExactId||0)+" live work IDs matched).": "")+
    (metadataErrors>0?` ${outcome.metadataFailures||0} About, ${outcome.activityFailures||0} activity and ${outcome.securityFailures||0} security evidence queries failed.`:'');

  if (outcome.status === "disabled") {
    return { kind: "warning", message: "GitHub synchronization is paused in Settings. Enable it to fetch new data." };
  }
  if (outcome.status === "rate-limited") {
    const reset = outcome.rateLimitResetAt ? " Try again after " + new Date(outcome.rateLimitResetAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + "." : " Please try again after GitHub resets its API allowance.";
    return { kind: "warning", message: "GitHub API rate limit: " + synced + " repositories refreshed." + reset + detail + " Live GitHub status remains stale for unrefreshed repositories." };
  }
  if (outcome.status === "partial" || failed > 0 || metadataErrors > 0) {
    return { kind: "warning", message: "Partial GitHub refresh: " + synced + " repositories checked, " + failed + " PR queries failed." + detail + " Any fallback plan is historical, not a successful live file refresh." };
  }
  if (outcome.status === "succeeded" && synced > 0) {
    return { kind: "success", message: "GitHub refresh complete: " + synced + " repositories checked." + detail };
  }
  return { kind: "warning", message: detail || "No repositories were refreshed. Another synchronization may be running; try again shortly." };
}

export function LiveConnection() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [expired, setExpired] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingMode,setSavingMode]=useState(false);
  const [feedback, setFeedback] = useState<SyncFeedback | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), SYNC_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    let source: EventSource | undefined, active = true, revision: string | undefined, sessionExpired = false;
    const expire = () => {
      if (!active) return;
      sessionExpired = true;
      setExpired(true);
      setConnected(false);
      source?.close();
      clearInterval(timer);
    };
    const receive = (data: LiveSnapshot) => {
      if (!active) return;
      setSnapshot(data);
      setUnavailable(false);
      if (revision !== undefined && revision !== data.revision) {
        window.dispatchEvent(new CustomEvent("engine-room-data-changed"));
      }
      revision = data.revision;
    };
    const poll = async () => {
      if (document.visibilityState === "hidden" || !active || sessionExpired) return;
      try {
        const response = await fetch("/api/live", { cache: "no-store" });
        if (response.status === 401) { expire(); return; }
        if (!response.ok) throw new Error("Source unavailable");
        receive(await response.json());
      } catch {
        if (active) { setConnected(false); setUnavailable(true); }
      }
    };
    if (typeof EventSource !== "undefined") {
      source = new EventSource("/api/live/events");
      source.addEventListener("portfolio", event => {
        if (!active) return;
        setConnected(true);
        try { receive(JSON.parse((event as MessageEvent).data)); }
        catch { setConnected(false); }
      });
      source.addEventListener("session-expired", expire);
      source.addEventListener("source-unavailable", () => {
        if (active) { setConnected(false); setUnavailable(true); }
      });
      source.onerror = () => {
        if (active) { setConnected(false); void poll(); }
      };
    }
    void poll();
    const timer = setInterval(() => { void poll(); }, 600000);
    return () => { active = false; source?.close(); clearInterval(timer); };
  }, []);

  async function setRefreshMode(automatic:boolean){
    setSavingMode(true);
    try{
      const current=await fetch('/api/admin/settings',{cache:'no-store'});
      if(!current.ok)throw Error('Administrator access required');
      const controls=await current.json();
      const response=await fetch('/api/admin/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        expectedRevision:controls.revision,settings:{...controls.settings,githubReconciliationEnabled:automatic}
      })});
      if(!response.ok)throw Error('Unable to save refresh mode');
      setSnapshot(previous=>previous?{...previous,reconciliationEnabled:automatic}:previous);
      setFeedback({kind:'success',message:automatic?'Automatic synchronization enabled. Budget guard stays in effect.':'Manual refresh enabled. Click Refresh to fetch current GitHub data.'});
    }catch(error){setFeedback({kind:'error',message:error instanceof Error?error.message:'Refresh mode unavailable'});}
    finally{setSavingMode(false);}
  }

  async function refreshFromGitHub() {
    if (syncing || expired) return;
    setSyncing(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "manual" }),
        cache: "no-store",
        signal: AbortSignal.timeout(150_000)
      });
      let outcome: SynchronizationOutcome = {};
      try { outcome = await response.json() as SynchronizationOutcome; }
      catch { /* The response may be an upstream error rather than JSON. */ }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Administrator access is required to synchronize GitHub.");
        }
        throw new Error(outcome.error || "GitHub synchronization is unavailable. Please try again.");
      }

      setFeedback(describeSynchronization(outcome));
      if ((outcome.repositories || 0) > 0 || (outcome.processed || 0) > 0 || (outcome.structured?.imported || 0) > 0) {
        router.refresh();
        window.dispatchEvent(new CustomEvent("engine-room-github-sync-complete"));
        try {
          const updated = await fetch("/api/live", { cache: "no-store" });
          if (updated.ok) setSnapshot(await updated.json() as LiveSnapshot);
        } catch { /* The existing live feed will retry. */ }
      }
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "GitHub synchronization failed."
      });
    } finally {
      setSyncing(false);
    }
  }

  const state = expired ? "Session expired" : unavailable ? "Disconnected" : snapshot ?
    ({ live: "Live", "catching-up": "Catching up", stale: "Stale", disconnected: "Disconnected" }[snapshot.state]) : "Connecting";

  const title = snapshot ?
    "Click to synchronize GitHub. Oldest repository sync: " + (snapshot.oldestSyncAt || "N/A") +
    ". " + snapshot.pendingEvents + " pending events. " + snapshot.failedRepositories + " source errors. " +
    (connected ? "Push connected" : "Polling fallback") + ". Normal reconciliation: " + snapshot.pollingMinutes + " minutes." :
    "Click to fetch the latest GitHub repository and pull request state.";

  return (
    <div className="live-readout" aria-label="Portfolio data status" title={title}>
      <button
        type="button"
        className="live-refresh-trigger"
        aria-label={syncing ? "Refreshing GitHub data" : "Refresh GitHub data"}
        disabled={syncing || expired}
        onClick={() => { void refreshFromGitHub(); }}
      >
        <span className={"system-light live-state-" + (unavailable || expired ? "disconnected" : snapshot?.state || "disconnected")} aria-hidden="true" />
        <span className="live-refresh-copy">
          <small>{connected ? "GITHUB · PUSH CONNECTED" : "GITHUB · POLLING / RECOVERY"} · {state}</small>
          <strong>{syncing ? "Refreshing…" : "Refresh"}</strong>
        </span>
      </button>
      {expired && <Link href="/login">Sign in again</Link>}
      {feedback && <div className={"live-sync-feedback is-" + feedback.kind} role="status">
        <span>{feedback.message}</span>
        <button type="button" aria-label="Dismiss refresh notification" onClick={() => setFeedback(null)}>×</button>
      </div>}
    </div>
  );
}

