import type { OperationMetric } from "../domain/operations";
import type { IncidentSignal, IncidentEvent } from "../domain/incidents";
import type { ReleaseEvent, ReleaseState } from "../domain/releases";
import type { FinancialEntry, FinancialForecast } from "../domain/finance";

export const telemetryKinds = ["metric", "incident", "incident-event", "release", "release-event", "financial-entry", "financial-forecast"] as const;
export type TelemetryKind = typeof telemetryKinds[number];
export const telemetryAdapters = ["engine-room-v1", "metrics-json-v1", "finance-json-v1", "finance-csv-v1"] as const;
export type TelemetryAdapter = typeof telemetryAdapters[number];
export type TelemetryCredential = { id: string; secret: string; projectId: string; environment: string; source: string; adapter: TelemetryAdapter; capabilities: TelemetryKind[]; evidenceTransitions: ReleaseState[] };
export type TelemetryRecord =
  | { kind: "metric"; externalId: string; metric: OperationMetric; value: number; observedAt: string }
  | { kind: "incident"; signal: Omit<IncidentSignal, "projectId" | "environment" | "source"> }
  | { kind: "incident-event"; externalId: string; event: IncidentEvent }
  | { kind: "release"; key: string; commitSha: string }
  | { kind: "release-event"; key: string; event: ReleaseEvent }
  | { kind: "financial-entry"; entry: Omit<FinancialEntry, "projectId" | "environment" | "source"> }
  | { kind: "financial-forecast"; forecast: Omit<FinancialForecast, "projectId" | "environment" | "source"> };
export type TelemetryEnvelope = { deliveryId: string; records: TelemetryRecord[] };
export class TelemetryError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "TelemetryError"; }
}
