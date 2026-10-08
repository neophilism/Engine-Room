import { principalStatuses, validateAccessObservation } from "../domain/access";
import type { TelemetryCredential, TelemetryRecord } from "../telemetry/types";

const keys = ["kind", "externalId", "principalId", "displayName", "principalKind", "status", "roles", "privileged", "mfaEnabled", "lastActiveAt", "organizationId", "organizationName", "credentialExpiresAt", "observedAt"];
function text(value: unknown, max = 200) { if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid access text."); return value; }
function time(value: unknown) {
  const valueText = text(value, 40), date = new Date(valueText);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(valueText) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,19) !== valueText.slice(0,19)) throw new Error("Invalid access timestamp.");
  return date.toISOString();
}
export function normalizeAccessRecord(value: unknown, credential: TelemetryCredential): TelemetryRecord {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !keys.includes(key))) throw new Error("Unexpected access field.");
  const raw = value as Record<string, unknown>;
  if (raw.kind !== "access-observation" || (raw.principalKind !== "person" && raw.principalKind !== "service") || typeof raw.status !== "string" || !principalStatuses.includes(raw.status as typeof principalStatuses[number])
    || typeof raw.privileged !== "boolean" || (raw.mfaEnabled !== null && typeof raw.mfaEnabled !== "boolean") || !Array.isArray(raw.roles) || raw.roles.some((role) => typeof role !== "string")) throw new Error("Invalid access observation.");
  const observation = { externalId: text(raw.externalId), principalId: text(raw.principalId), displayName: text(raw.displayName), principalKind: raw.principalKind as "person" | "service", status: raw.status as typeof principalStatuses[number], roles: raw.roles as string[],
    privileged: raw.privileged, mfaEnabled: raw.mfaEnabled as boolean | null, lastActiveAt: raw.lastActiveAt == null ? null : time(raw.lastActiveAt), organizationId: raw.organizationId === undefined ? undefined : text(raw.organizationId), organizationName: raw.organizationName === undefined ? undefined : text(raw.organizationName),
    credentialExpiresAt: raw.credentialExpiresAt == null ? null : time(raw.credentialExpiresAt), observedAt: time(raw.observedAt) };
  validateAccessObservation({ ...observation, projectId: credential.projectId, environment: credential.environment, source: credential.source });
  return { kind: "access-observation", observation };
}
