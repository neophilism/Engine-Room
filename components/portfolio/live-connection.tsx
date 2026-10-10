"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LiveSnapshot } from "../../lib/domain/live-monitor";

type SynchronizationOutcome = {
  status?: "succeeded" | "partial" | "disabled" | "rate-limited";
  repositories?: number;
  failed?: number;
  processed?: number;
  error?: string;
};

type SyncFeedback = { kind: "success" | "warning" | "error"; message: string };

function describeSynchronization(outcome: SynchronizationOutcome): SyncFeedback {
  const synced = Number(outcome.repositories || 0);
  const failed = Number(outcome.failed || 0);

  if (outcome.status === "disabled") {
    return { kind: "warning", message: "GitHub synchronization is paused in Settings. Enable it to fetch new data." };
  }
  if (outcome.status === "rate-limited") {
    return { kind: "warning", message: "GitHub's rate limit was reached. " + synced + " repositories refreshed; the remainder will retry automatically." };
  }
  if (outcome.status === "partial" || failed > 0) {
    return { kind: "warning", message: "Partial GitHub refresh: " + synced + " repositories refreshed, " + failed + " failed. Unavailable sources retain their previous data." };
  }
  if (outcome.status === "succeeded" && synced > 0) {
    return { kind: "success", message: "GitHub refresh complete: " + synced + " repositories checked. Dashboard data updated." };
  }
  return { kind: "warning", message: "No repositories were refreshed. Another synchronization may be running; try again shortly." };
}

export function LiveConnection() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [expired, setExpired] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<SyncFeedback | null>(null);

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
    const timer = setInterval(() => { void poll(); }, 15000);
    return () => { active = false; source?.close(); clearInterval(timer); };
  }, []);

  async function refreshFromGitHub() {
    if (syncing || expired) return;
    setSyncing(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "manual" }),
        cache: "no-store"
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
      if ((outcome.repositories || 0) > 0 || (outcome.processed || 0) > 0) {
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
          <small>{connected ? "GITHUB · PUSH CONNECTED" : "GITHUB · POLLING / RECOVERY"}</small>
          <strong>{syncing ? "Refreshing…" : state}</strong>
        </span>
      </button>
      {expired && <Link href="/login">Sign in again</Link>}
      {feedback && <div className={"live-sync-feedback is-" + feedback.kind} role="status">{feedback.message}</div>}
    </div>
  );
}
