import {readdir} from "node:fs/promises";
import { getDatabasePool } from "../../../lib/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A healthy process must not report "ready" before the live-monitor schema exists.
// The runtime applies migrations before starting Next.js; this query is read-only.
export async function GET() {
  try {
    const migrations=(await readdir("db/migrations")).filter(name=>/^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
    const required=migrations.at(-1)?.slice(0,4);
    if(!required)throw new Error("Required migration inventory unavailable");
    const result = await getDatabasePool().query<{ ready: boolean; schema_version:string }>(
      `select
        to_regclass('public.projects') is not null
        and to_regclass('public.github_pull_requests') is not null
        and to_regclass('public.engine_room_control_settings') is not null
        and to_regclass('public.github_repository_sync') is not null
        and to_regclass('public.github_check_runs') is not null
        and to_regclass('public.engine_room_live_state') is not null
        and to_regclass('public.project_plan_documents') is not null
        and to_regclass('public.project_plan_items') is not null
        and exists (select 1 from engine_room_schema_migrations where version = $1)
        and exists (select 1 from information_schema.columns where table_schema='public' and table_name='project_plan_items' and column_name='external_dependencies')
        and exists (select 1 from information_schema.columns where table_schema='public' and table_name='project_plan_documents' and column_name='runtime_evidence')
        as ready,(select max(version) from engine_room_schema_migrations) AS schema_version`,[required]
    );
    if (!result.rows[0]?.ready) {
      return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ status: "ready", schemaVersion: result.rows[0].schema_version }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
