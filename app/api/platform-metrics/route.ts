import { NextResponse } from "next/server";
import { loadFiresideArchiveMetrics } from "../../../lib/server/public-platform-metrics";
import { loadMarketplaceMetrics } from "../../../lib/server/public-marketplace-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [fireside, ram] = await Promise.all([loadFiresideArchiveMetrics(), loadMarketplaceMetrics()]);
  return NextResponse.json({ fireside, ram }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=240" }
  });
}
