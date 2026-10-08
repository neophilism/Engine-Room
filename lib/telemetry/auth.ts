import { createHmac, timingSafeEqual } from "node:crypto";
import type { EnvironmentSource } from "../config/env";
import { telemetryAdapters, telemetryKinds, TelemetryError, type TelemetryCredential } from "./types";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function readTelemetryCredentials(source: EnvironmentSource = process.env): TelemetryCredential[] {
  try {
    const value: unknown = JSON.parse(source.ENGINE_ROOM_TELEMETRY_KEYS ?? "[]");
    if (!Array.isArray(value) || value.length > 100) throw new Error();
    const ids = new Set<string>();
    return value.map((item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error();
      const record = item as Record<string, unknown>;
      const { id, secret, projectId, environment, source, adapter, capabilities, evidenceTransitions = [] } = record;
      if (typeof id !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(id) || ids.has(id)
        || typeof secret !== "string" || Buffer.byteLength(secret) < 32 || Buffer.byteLength(secret) > 1024
        || typeof projectId !== "string" || !uuid.test(projectId)
        || typeof environment !== "string" || !/^[a-z0-9-]{1,64}$/.test(environment)
        || typeof source !== "string" || !/^[A-Za-z0-9._-]{1,128}$/.test(source)
        || typeof adapter !== "string" || !telemetryAdapters.includes(adapter as TelemetryCredential["adapter"])
        || !Array.isArray(capabilities) || capabilities.length === 0 || capabilities.some((kind) => !telemetryKinds.includes(kind))
        || !Array.isArray(evidenceTransitions) || evidenceTransitions.some((state) => !["approved", "live", "rolled-back"].includes(state))) throw new Error();
      ids.add(id);
      return { id, secret, projectId, environment, source, adapter, capabilities, evidenceTransitions } as TelemetryCredential;
    });
  } catch { throw new TelemetryError(503, "Telemetry credentials are unavailable."); }
}
export function authenticateTelemetry(headers: Headers, body: Uint8Array, credentials: TelemetryCredential[], now = Date.now()) {
  const id = headers.get("x-engine-room-key");
  const timestamp = headers.get("x-engine-room-timestamp") ?? "";
  const signature = headers.get("x-engine-room-signature") ?? "";
  const credential = credentials.find((item) => item.id === id);
  if (!credential || !/^[0-9]{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 300_000 || !/^sha256=[a-f0-9]{64}$/i.test(signature)) throw new TelemetryError(401, "Invalid telemetry authentication.");
  const expected = createHmac("sha256", credential.secret).update(timestamp + ".").update(body).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"))) throw new TelemetryError(401, "Invalid telemetry authentication.");
  return credential;
}
export const MAX_TELEMETRY_BYTES = 65_536;
export async function readTelemetryBody(request: Request): Promise<Uint8Array> {
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json") throw new TelemetryError(415, "Telemetry requires application/json.");
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_TELEMETRY_BYTES) throw new TelemetryError(413, "Telemetry payload is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new TelemetryError(400, "Telemetry payload is empty.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_TELEMETRY_BYTES) { await reader.cancel(); throw new TelemetryError(413, "Telemetry payload is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
