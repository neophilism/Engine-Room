import { NextResponse } from "next/server";
import { loadFiresideArchiveMetrics } from "../../../lib/server/public-platform-metrics";
import { loadMarketplaceMetrics } from "../../../lib/server/public-marketplace-metrics";
import { loadFiresideFeedHealth } from "../../../lib/server/public-fireside-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [fireside, firesideHealth, ram] = await Promise.all([loadFiresideArchiveMetrics(), loadFiresideFeedHealth(), loadMarketplaceMetrics()]);
  return NextResponse.json({ fireside, firesideHealth, ram }, {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
