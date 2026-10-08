import type { ReleaseTarget } from "./project-readiness";
import type { MachineState } from "../design/theme";

export const releaseStates = ["draft", "building", "validating", "awaiting-approval", "approved", "deploying", "live", "failed", "rolled-back", "cancelled"] as const;
export type ReleaseState = typeof releaseStates[number];
export type ReleaseRecord = ReleaseTarget & { id: string; projectId: string; projectName: string; projectSlug: string; key: string; state: ReleaseState; updatedAt: string };
export type ReleaseEvent = { key: string; from: ReleaseState; to: ReleaseState; actor: string; occurredAt: string; evidenceUrl?: string };
export type ReleasesOverview = { source: "database" | "unconfigured" | "error"; releases: ReleaseRecord[] };

const edges: Record<ReleaseState, readonly ReleaseState[]> = {
  draft: ["building", "cancelled"], building: ["validating", "failed", "cancelled"], validating: ["awaiting-approval", "failed", "cancelled"],
  "awaiting-approval": ["approved", "cancelled"], approved: ["deploying", "cancelled"], deploying: ["live", "failed"],
  live: ["rolled-back"], failed: ["building", "cancelled"], "rolled-back": [], cancelled: []
};

export function validateReleaseEvent(event: ReleaseEvent) {
  if (!releaseStates.includes(event.from) || !releaseStates.includes(event.to) || !edges[event.from].includes(event.to)) throw new Error(`Invalid release transition: ${event.from} → ${event.to}`);
  if (!event.key.trim() || !event.actor.trim() || !Number.isFinite(new Date(event.occurredAt).getTime()) || new Date(event.occurredAt).getTime() > Date.now() + 300_000) throw new Error("Release events require identity, actor, and a valid timestamp.");
  if (["approved", "live", "rolled-back"].includes(event.to) && !event.evidenceUrl) throw new Error("Approval, live, and rollback transitions require evidence.");
  if (event.evidenceUrl) {
    const url = new URL(event.evidenceUrl);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Release evidence must use HTTPS without embedded credentials.");
  }
}

export function releasePipeline(state: ReleaseState, environment = "production"): Array<{ label: string; state: MachineState }> {
  const stage = state === "draft" || state === "building" || state === "validating" ? 0 : state === "awaiting-approval" || state === "approved" ? 1 : state === "deploying" ? 2 : state === "live" ? 3 : -1;
  return ["Build & validate", "Approval", "Rollout", environment === "production" ? "Production" : "Live environment"].map((label, index) => ({ label,
    state: state === "failed" ? "blocked" : state === "rolled-back" || state === "cancelled" ? "offline" : index < stage || (index === 3 && state === "live") ? "complete" : index === stage ? "active" : "neutral" }));
}
