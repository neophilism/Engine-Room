import { getDatabasePool } from "../../../lib/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getDatabasePool().query<{ ready: boolean }>(
      `select
        to_regclass('public.projects') is not null
        and to_regclass('public.github_pull_requests') is not null
        and to_regclass('public.engine_room_control_settings') is not null
        and exists (select 1 from engine_room_schema_migrations where version = '0015')
        as ready`
    );
    if (!result.rows[0]?.ready) {
      return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
