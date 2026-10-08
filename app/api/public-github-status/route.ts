import { NextResponse } from "next/server";
import { loadPublicGitHubStatus } from "../../../lib/server/public-github-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await loadPublicGitHubStatus();
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
