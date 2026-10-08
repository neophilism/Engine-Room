import { NextResponse } from "next/server";
import { loadFiresideArchiveMetrics } from "../../../lib/server/public-platform-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const fireside = await loadFiresideArchiveMetrics();
  return NextResponse.json({ fireside }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=240" }
  });
}
