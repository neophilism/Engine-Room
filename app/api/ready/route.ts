import { checkDatabaseConnection } from "../../../lib/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connected = await checkDatabaseConnection();
    if (!connected) return Response.json({ status: "unavailable" }, { status: 503 });
    return Response.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
