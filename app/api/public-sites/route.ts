import { NextResponse } from "next/server";
import { loadPublicSiteObservations } from "../../../lib/server/public-site-observations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const observations = await loadPublicSiteObservations();
  return NextResponse.json({ observations }, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=540",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
