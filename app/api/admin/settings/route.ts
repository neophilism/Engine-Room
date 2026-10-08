import { NextResponse } from "next/server";
import { authorizeAdmin, trustedWriteOrigin } from "../../../../lib/server/admin-auth";
import { getRuntimeConfig } from "../../../../lib/config/env";
import { InvalidControlSettings, parseControlUpdate } from "../../../../lib/domain/control-settings";
import { loadControlSnapshot, StaleSettingsRevision, updateControlSettings } from "../../../../lib/server/control-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "Vary": "Authorization" } });
}

function denial(request: Request): Response | null {
  const auth = authorizeAdmin(request.headers);
  if (auth === "unconfigured") return reply({ error: "Administrative access is not configured." }, 503);
  if (auth !== "authorized") return reply({ error: "Administrative credentials are required." }, 401);
  if (!getRuntimeConfig().databaseUrl) return reply({ error: "The database is not configured." }, 503);
  return null;
}

export async function GET(request: Request) {
  const refused = denial(request);
  if (refused) return refused;
  try {
    return reply(await loadControlSnapshot(), 200);
  } catch {
    return reply({ error: "Administrative settings are unavailable. Check the database migrations." }, 503);
  }
}

export async function PUT(request: Request) {
  const refused = denial(request);
  if (refused) return refused;
  if (!trustedWriteOrigin(request)) return reply({ error: "Request origin is not trusted." }, 403);
  let input;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 2048) return reply({ error: "Settings request is too large." }, 413);
    input = parseControlUpdate(JSON.parse(raw) as unknown);
  } catch (error) {
    return reply({ error: error instanceof InvalidControlSettings ? error.message : "Invalid JSON settings payload." }, 400);
  }
  try {
    return reply(await updateControlSettings(input.expectedRevision, input.settings), 200);
  } catch (error) {
    if (error instanceof StaleSettingsRevision) return reply({ error: error.message }, 409);
    return reply({ error: "Settings could not be saved." }, 503);
  }
}
