// @vitest-environment node
import { expect, it } from "vitest";
import { normalizeTelemetry } from "../telemetry/adapters";
import type { TelemetryCredential } from "../telemetry/types";

it("requires scoped access permission and rejects spoofed scope or inconsistent privilege", () => {
  const credential: TelemetryCredential = { id: "identity", secret: "test-secret-with-at-least-32-bytes", projectId: "00000000-0000-0000-0000-000000000001", environment: "production", source: "identity", adapter: "engine-room-v1", capabilities: ["access-observation"], evidenceTransitions: [] };
  const record = { kind: "access-observation", externalId: "observation-1", principalId: "operator", displayName: "Operator", principalKind: "person", status: "active", roles: ["admin"], privileged: true, mfaEnabled: null, observedAt: new Date().toISOString() };
  const body = (value: unknown) => Buffer.from(JSON.stringify({ version: 1, deliveryId: "identity-1", records: [value] }));
  expect(normalizeTelemetry(body(record), credential).records[0]).toMatchObject({ kind: "access-observation", observation: { mfaEnabled: null, lastActiveAt: null } });
  expect(() => normalizeTelemetry(body(record), { ...credential, capabilities: ["metric"] })).toThrow("permissions");
  expect(() => normalizeTelemetry(body({ ...record, projectId: "another-project" }), credential)).toThrow("Invalid");
  expect(() => normalizeTelemetry(body({ ...record, privileged: false }), credential)).toThrow("Invalid");
});
