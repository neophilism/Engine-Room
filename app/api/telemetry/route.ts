import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateTelemetry, readTelemetryBody, readTelemetryCredentials } from "../../../lib/telemetry/auth";
import { normalizeTelemetry } from "../../../lib/telemetry/adapters";
import { TelemetryError } from "../../../lib/telemetry/types";
import { ingestTelemetry } from "../../../lib/server/telemetry";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const credentials = readTelemetryCredentials();
    if (!credentials.length) throw new TelemetryError(503, "Telemetry ingestion is not configured.");
    const body = await readTelemetryBody(request);
    const credential = authenticateTelemetry(request.headers, body, credentials);
    const envelope = normalizeTelemetry(body, credential);
    const status = await ingestTelemetry(credential, envelope, createHash("sha256").update(body).digest("hex"));
    return NextResponse.json({ ok: true, deliveryId: envelope.deliveryId, status }, { status: status === "accepted" ? 202 : 200 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof TelemetryError ? error.message : "Telemetry ingestion is unavailable." }, { status: error instanceof TelemetryError ? error.status : 503 });
  }
}
