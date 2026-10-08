import { operationMetrics, validateOperationSample } from "../domain/operations";
import { incidentSeverities, incidentStates, validateIncidentEvent, validateIncidentSignal } from "../domain/incidents";
import { releaseStates, validateReleaseEvent } from "../domain/releases";
import { TelemetryError, type TelemetryCredential, type TelemetryEnvelope, type TelemetryRecord } from "./types";

function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !keys.includes(key))) throw new Error("Unexpected object or field.");
  return value as Record<string, unknown>;
}
function string(value: unknown, max = 200) { if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid text."); return value; }
function identity(value: unknown, max = 200) { const text = string(value, max); if (!/^[A-Za-z0-9._:-]+$/.test(text)) throw new Error("Invalid identity."); return text; }
function key(value: unknown) { const text = identity(value, 128); if (!/^[A-Za-z0-9._-]+$/.test(text)) throw new Error("Invalid release key."); return text; }
function time(value: unknown) {
  const text = string(value, 40), date = new Date(text);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(text) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== text.slice(0, 19)) throw new Error("Timestamp must use a valid UTC date.");
  return date.toISOString();
}
function member<T extends string>(value: unknown, choices: readonly T[]): T { if (typeof value !== "string" || !choices.includes(value as T)) throw new Error("Unknown value."); return value as T; }
function evidence(value: unknown) { if (value === undefined) return undefined; const text = string(value, 2048), url = new URL(text); if (url.protocol !== "https:" || url.username || url.password) throw new Error("Unsafe evidence URL."); return text; }
function list(value: unknown) { if (!Array.isArray(value) || value.length === 0 || value.length > 100) throw new Error("A delivery requires 1–100 records."); return value; }
function number(value: unknown) { if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid metric value."); return value; }

export function assertTelemetryScope(credential: TelemetryCredential, records: TelemetryRecord[]) {
  for (const record of records) {
    if (!credential.capabilities.includes(record.kind)) throw new TelemetryError(403, "Telemetry record exceeds source permissions.");
    if (record.kind === "release-event" && ["approved", "live", "rolled-back"].includes(record.event.to) && !credential.evidenceTransitions.includes(record.event.to)) throw new TelemetryError(403, "Source cannot attest this release transition.");
  }
}
function normalizeRecord(value: unknown, credential: TelemetryCredential): TelemetryRecord {
  const item = object(value, ["kind", "externalId", "metric", "value", "observedAt", "title", "severity", "occurredAt", "evidenceUrl", "event", "key", "commitSha"]);
  if (item.kind === "metric") {
    object(item, ["kind", "externalId", "metric", "value", "observedAt"]);
    const sample = { projectId: credential.projectId, environment: credential.environment, source: credential.source, externalId: identity(item.externalId), metric: member(item.metric, operationMetrics), value: number(item.value), observedAt: time(item.observedAt) };
    validateOperationSample(sample); return { kind: "metric", externalId: sample.externalId, metric: sample.metric, value: sample.value, observedAt: sample.observedAt };
  }
  if (item.kind === "incident") {
    object(item, ["kind", "externalId", "title", "severity", "occurredAt", "evidenceUrl"]);
    const signal = { externalId: identity(item.externalId), title: string(item.title, 300), severity: member(item.severity, incidentSeverities), occurredAt: time(item.occurredAt), evidenceUrl: evidence(item.evidenceUrl) };
    validateIncidentSignal({ ...signal, projectId: credential.projectId, environment: credential.environment, source: credential.source }); return { kind: "incident", signal };
  }
  if (item.kind === "incident-event") {
    object(item, ["kind", "externalId", "event"]);
    const raw = object(item.event, ["key", "from", "to", "occurredAt", "note", "evidenceUrl"]);
    const event = { key: identity(raw.key), from: member(raw.from, incidentStates), to: member(raw.to, incidentStates), actor: credential.source, occurredAt: time(raw.occurredAt), note: string(raw.note, 2000), evidenceUrl: evidence(raw.evidenceUrl) };
    validateIncidentEvent(event); return { kind: "incident-event", externalId: identity(item.externalId), event };
  }
  if (item.kind === "release") {
    object(item, ["kind", "key", "commitSha"]);
    const commitSha = string(item.commitSha, 40); if (!/^[a-f0-9]{40}$/.test(commitSha)) throw new Error("Invalid commit SHA.");
    return { kind: "release", key: key(item.key), commitSha };
  }
  if (item.kind === "release-event") {
    object(item, ["kind", "key", "event"]);
    const raw = object(item.event, ["key", "from", "to", "occurredAt", "evidenceUrl"]);
    const event = { key: identity(raw.key), from: member(raw.from, releaseStates), to: member(raw.to, releaseStates), actor: credential.source, occurredAt: time(raw.occurredAt), evidenceUrl: evidence(raw.evidenceUrl) };
    validateReleaseEvent(event); return { kind: "release-event", key: key(item.key), event };
  }
  throw new Error("Unknown telemetry record.");
}
const aliases = { availability: "availability-percent", latencyP95Ms: "latency-p95-ms", requestsPerMinute: "requests-per-minute", errorRate: "error-rate-percent", cpu: "cpu-percent", memory: "memory-percent" } as const;
export function normalizeTelemetry(body: Uint8Array, credential: TelemetryCredential): TelemetryEnvelope {
  try {
    const raw: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
    const item = object(raw, credential.adapter === "metrics-json-v1" ? ["version", "deliveryId", "observedAt", "samples"] : ["version", "deliveryId", "records"]);
    if (item.version !== 1) throw new Error("Unsupported telemetry version.");
    const deliveryId = identity(item.deliveryId);
    const records = credential.adapter === "metrics-json-v1" ? list(item.samples).map((sample) => {
      const entry = object(sample, ["id", "metric", "value"]);
      const alias = member(entry.metric, Object.keys(aliases) as Array<keyof typeof aliases>);
      return normalizeRecord({ kind: "metric", externalId: entry.id, metric: aliases[alias], value: entry.value, observedAt: item.observedAt }, credential);
    }) : list(item.records).map((record) => normalizeRecord(record, credential));
    assertTelemetryScope(credential, records);
    return { deliveryId, records };
  } catch (error) {
    if (error instanceof TelemetryError) throw error;
    throw new TelemetryError(400, "Invalid telemetry payload.");
  }
}
