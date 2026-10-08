// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { authenticateTelemetry, readTelemetryBody, readTelemetryCredentials, MAX_TELEMETRY_BYTES } from "./auth";
import { normalizeTelemetry } from "./adapters";
import type { TelemetryCredential } from "./types";

const credential: TelemetryCredential = { id: "monitor", secret: "test-secret-with-at-least-32-bytes", projectId: "00000000-0000-0000-0000-000000000001", environment: "production", source: "monitor", adapter: "engine-room-v1", capabilities: ["metric", "incident", "incident-event", "release", "release-event"], evidenceTransitions: [] };
const payload = (records: unknown[]) => Buffer.from(JSON.stringify({ version: 1, deliveryId: "delivery-1", records }));
describe("scoped signed telemetry", () => {
  it("authenticates exact bytes and timestamp while rejecting tampering and expired signatures", () => {
    const body = payload([]), now = Date.now(), timestamp = String(now);
    const signature = "sha256=" + createHmac("sha256", credential.secret).update(timestamp + ".").update(body).digest("hex");
    const headers = new Headers({ "x-engine-room-key": credential.id, "x-engine-room-timestamp": timestamp, "x-engine-room-signature": signature });
    expect(authenticateTelemetry(headers, body, [credential], now)).toBe(credential);
    expect(() => authenticateTelemetry(headers, Buffer.from("changed"), [credential], now)).toThrow("authentication");
    expect(() => authenticateTelemetry(headers, body, [credential], now + 300_001)).toThrow("authentication");
    expect(() => authenticateTelemetry(headers, body, [{ ...credential, id: "revoked" }], now)).toThrow("authentication");
  });
  it("fails closed for malformed or duplicate credential configuration", () => {
    expect(readTelemetryCredentials({ ENGINE_ROOM_TELEMETRY_KEYS: JSON.stringify([credential]) })).toHaveLength(1);
    expect(() => readTelemetryCredentials({ ENGINE_ROOM_TELEMETRY_KEYS: JSON.stringify([credential, credential]) })).toThrow("unavailable");
    expect(() => readTelemetryCredentials({ ENGINE_ROOM_TELEMETRY_KEYS: JSON.stringify([{ ...credential, secret: "short" }]) })).toThrow("unavailable");
    expect(() => readTelemetryCredentials({ ENGINE_ROOM_TELEMETRY_KEYS: "{}" })).toThrow("unavailable");
  });
  it("normalizes metric aliases and rejects malformed, nonfinite, or oversized record sets", () => {
    const observedAt = new Date().toISOString();
    expect(normalizeTelemetry(Buffer.from(JSON.stringify({ version: 1, deliveryId: "aliases", observedAt, samples: [{ id: "cpu-1", metric: "cpu", value: 20 }] })), { ...credential, adapter: "metrics-json-v1" }).records[0]).toMatchObject({ kind: "metric", metric: "cpu-percent", value: 20 });
    expect(() => normalizeTelemetry(payload([{ kind: "metric", externalId: "x", metric: "cpu-percent", value: 101, observedAt }]), credential)).toThrow("Invalid");
    expect(() => normalizeTelemetry(payload([{ kind: "metric", externalId: "x", metric: "cpu-percent", value: "NaN", observedAt }]), credential)).toThrow("Invalid");
    expect(() => normalizeTelemetry(payload([{ kind: "metric", externalId: "x", metric: "cpu-percent", value: 10, observedAt: "2026-02-30T00:00:00Z" }]), credential)).toThrow("Invalid");
    expect(() => normalizeTelemetry(payload(Array(101).fill({})), credential)).toThrow("Invalid");
    expect(() => normalizeTelemetry(Buffer.from([0xff]), credential)).toThrow("Invalid");
  });
  it("rejects payload-supplied scope and enforces privileged release attestations", () => {
    const record = { kind: "metric", externalId: "x", metric: "cpu-percent", value: 20, observedAt: new Date().toISOString() };
    expect(() => normalizeTelemetry(payload([{ ...record, projectId: "another-project" }]), credential)).toThrow("Invalid");
    expect(() => normalizeTelemetry(payload([record]), { ...credential, capabilities: ["incident"] })).toThrow("permissions");
    const event = { kind: "release-event", key: "v1", event: { key: "approval", from: "awaiting-approval", to: "approved", occurredAt: new Date().toISOString(), evidenceUrl: "https://example.org/approval" } };
    expect(() => normalizeTelemetry(payload([event]), credential)).toThrow("attest");
    expect(normalizeTelemetry(payload([event]), { ...credential, evidenceTransitions: ["approved"] }).records[0]).toMatchObject({ kind: "release-event", event: { actor: "monitor" } });
    expect(() => normalizeTelemetry(payload([{ ...event, event: { ...event.event, actor: "admin" } }]), credential)).toThrow("Invalid");
  });
  it("bounds streamed payloads without trusting Content-Length", async () => {
    const request = (body: string) => new Request("https://example.org/api/telemetry", { method: "POST", headers: { "content-type": "application/json" }, body });
    await expect(readTelemetryBody(request("x".repeat(MAX_TELEMETRY_BYTES + 1)))).rejects.toMatchObject({ status: 413 });
    expect(await readTelemetryBody(request("{}"))).toEqual(Buffer.from("{}"));
    await expect(readTelemetryBody(new Request("https://example.org", { method: "POST", body: "{}" }))).rejects.toMatchObject({ status: 415 });
  });
});
