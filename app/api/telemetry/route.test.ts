// @vitest-environment node
import { createHmac } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("../../../lib/server/telemetry", () => ({ ingestTelemetry: vi.fn().mockResolvedValue("accepted") }));
import { ingestTelemetry } from "../../../lib/server/telemetry";
import { POST } from "./route";

afterEach(() => { delete process.env.ENGINE_ROOM_TELEMETRY_KEYS; vi.clearAllMocks(); });
it("rejects unauthenticated writes before persistence and accepts a correctly signed scoped metric", async () => {
  const credential = { id: "monitor", secret: "test-secret-with-at-least-32-bytes", projectId: "00000000-0000-0000-0000-000000000001", environment: "production", source: "monitor", adapter: "engine-room-v1", capabilities: ["metric"] };
  process.env.ENGINE_ROOM_TELEMETRY_KEYS = JSON.stringify([credential]);
  const body = JSON.stringify({ version: 1, deliveryId: "signed-1", records: [{ kind: "metric", externalId: "cpu-1", metric: "cpu-percent", value: 5, observedAt: new Date().toISOString() }] });
  const timestamp = String(Date.now());
  const headers = { "content-type": "application/json", "x-engine-room-key": "monitor", "x-engine-room-timestamp": timestamp, "x-engine-room-signature": "sha256=" + createHmac("sha256", credential.secret).update(timestamp + "." + body).digest("hex") };
  expect((await POST(new Request("https://example.org/api/telemetry", { method: "POST", body, headers: { "content-type": "application/json" } }))).status).toBe(401);
  expect(ingestTelemetry).not.toHaveBeenCalled();
  expect((await POST(new Request("https://example.org/api/telemetry", { method: "POST", body, headers }))).status).toBe(202);
  expect(ingestTelemetry).toHaveBeenCalledWith(expect.objectContaining({ projectId: credential.projectId, environment: "production" }), expect.objectContaining({ deliveryId: "signed-1" }), expect.stringMatching(/^[a-f0-9]{64}$/));
});
it("returns a recoverable unavailable response when no source is configured", async () => {
  expect((await POST(new Request("https://example.org/api/telemetry", { method: "POST", body: "{}" }))).status).toBe(503);
  expect(ingestTelemetry).not.toHaveBeenCalled();
});
