import { NextResponse } from "next/server";
import { isRequestAdmin, requestAdminActor } from "../../../../lib/server/request-admin";
import { trustedWriteOrigin } from "../../../../lib/server/admin-auth";
import { InvalidVelocityMarker, parseVelocityMarkerDate, saveBoardroomActivation } from "../../../../lib/server/development-velocity-markers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(value: unknown, status: number) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!await isRequestAdmin(request)) return reply({ error: "Administrator required" }, 401);
  if (!trustedWriteOrigin(request)) return reply({ error: "Untrusted origin" }, 403);
  let date: string | null;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 128) return reply({ error: "Request too large" }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
        Object.keys(parsed).length !== 1 || !Object.hasOwn(parsed,"date")) {
      throw new InvalidVelocityMarker("Expected a single date field.");
    }
    date = parseVelocityMarkerDate((parsed as {date:unknown}).date);
  } catch (error) {
    return reply({error: error instanceof InvalidVelocityMarker ? error.message : "Invalid request"},400);
  }
  try {
    const actor = await requestAdminActor(request);
    if (!actor) return reply({ error: "Administrator required" }, 401);
    return reply(await saveBoardroomActivation(date, actor), 200);
  } catch {
    return reply({ error: "Unable to save the comparison date" }, 503);
  }
}
