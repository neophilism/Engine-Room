import type { MachineState } from "../design/theme";

export const incidentStates = ["detected", "acknowledged", "investigating", "mitigated", "resolved"] as const;
export const incidentSeverities = ["low", "medium", "high", "critical"] as const;
export type IncidentState = typeof incidentStates[number];
export type IncidentSeverity = typeof incidentSeverities[number];
export type IncidentSignal = { projectId: string; environment: string; source: string; externalId: string; title: string; severity: IncidentSeverity; occurredAt: string; evidenceUrl?: string };
export type IncidentEvent = { key: string; from: IncidentState; to: IncidentState; actor: string; occurredAt: string; note: string; evidenceUrl?: string };
export type IncidentRecord = IncidentSignal & { id: string; projectName: string; projectSlug: string; state: IncidentState; updatedAt: string; resolvedAt: string | null; lastNote: string | null };
export type IncidentsOverview = { source: "database" | "unconfigured" | "error"; incidents: IncidentRecord[] };

const edges: Record<IncidentState, readonly IncidentState[]> = {
  detected: ["acknowledged"], acknowledged: ["investigating", "mitigated"],
  investigating: ["mitigated", "resolved"], mitigated: ["investigating", "resolved"], resolved: ["detected"]
};
function validTime(value: string) { return Number.isFinite(new Date(value).getTime()) && new Date(value).getTime() <= Date.now() + 300_000; }
function validateEvidence(value?: string) {
  if (!value) return;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Incident evidence requires HTTPS without embedded credentials.");
}
export function validateIncidentSignal(signal: IncidentSignal) {
  if (!signal.projectId || !/^[a-z0-9-]{1,64}$/.test(signal.environment) || !/^[A-Za-z0-9._-]{1,128}$/.test(signal.source) || !/^[A-Za-z0-9._:-]{1,200}$/.test(signal.externalId)
    || !signal.title.trim() || signal.title.length > 300 || !incidentSeverities.includes(signal.severity) || !validTime(signal.occurredAt)) throw new Error("Invalid incident identity, severity, title, or timestamp.");
  validateEvidence(signal.evidenceUrl);
}
export function validateIncidentEvent(event: IncidentEvent) {
  if (!incidentStates.includes(event.from) || !incidentStates.includes(event.to) || !edges[event.from].includes(event.to)) throw new Error("Invalid incident transition.");
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(event.key) || !event.actor.trim() || event.actor.length > 128 || !event.note.trim() || event.note.length > 2000 || !validTime(event.occurredAt)) throw new Error("Incident events require identity, actor, note, and a valid timestamp.");
  validateEvidence(event.evidenceUrl);
}
export function incidentPipeline(state: IncidentState): Array<{ label: string; state: MachineState }> {
  const stage = state === "detected" ? 0 : state === "acknowledged" ? 1 : state === "resolved" ? 3 : 2;
  return ["Detection", "Acknowledgement", "Containment", "Resolution"].map((label, index) => ({ label,
    state: state === "resolved" || index < stage ? "complete" : index === stage ? "active" : "neutral" }));
}
