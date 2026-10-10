import { getDatabasePool } from "../../../lib/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A healthy process must not report "ready" before the live-monitor schema exists.
// The runtime applies migrations before starting Next.js; this query is read-only.
export async function GET() {
  try {
    const result = await getDatabasePool().query<{ ready: boolean }>(
      `select
        to_regclass('public.projects') is not null
        and to_regclass('public.github_pull_requests') is not null
        and to_regclass('public.engine_room_control_settings') is not null
        and to_regclass('public.github_repository_sync') is not null
        and to_regclass('public.github_check_runs') is not null
        and to_regclass('public.engine_room_live_state') is not null
        and to_regclass('public.project_plan_documents') is not null
        and to_regclass('public.project_plan_items') is not null
        and exists (select 1 from engine_room_schema_migrations where version = '0017')
        as ready`
    );
    if (!result.rows[0]?.ready) {
      return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ status: "ready", schemaVersion: "0017" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
