import { getRuntimeConfig } from "../config/env";
import { getDatabasePool } from "./database";
import type { DevelopmentVelocityData, VelocityProject } from "../domain/development-velocity";

type VelocityRow = {
  project_id: string;
  display_name: string;
  repository_full_name: string;
  day: Date | string | null;
  merged_count: number | string;
  /** Historical lifetime summary repeats for every daily row of one repository. */
  repository_started_on?: string | null;
  lifetime_merged_count?: number | string;
  start_source?: "github" | "first-pr" | "launch-window" | "unavailable";
};
type SyncRow = {
  total: number | string;
  synchronized: number | string;
  latest: Date | null;
  oldest: Date | null;
};

const empty = (source: DevelopmentVelocityData["source"]): DevelopmentVelocityData => ({
  source, projects: [], boardroomStartDate: null, observedAt: new Date().toISOString(),
  latestSuccessfulSyncAt: null, oldestSuccessfulSyncAt: null,
  trackedRepositories: 0, synchronizedRepositories: 0
});

function utcDay(value: Date | string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid stored merge day.");
  return date.toISOString().slice(0, 10);
}

export function normalizeVelocityRows(rows: readonly VelocityRow[]): VelocityProject[] {
  const projects = new Map<string, VelocityProject>();
  for (const row of rows) {
    let project = projects.get(row.project_id);
    if (!project) {
      project = {
        id: row.project_id, name: row.display_name, repositories: [], days: [],
        lifetime: {startedOn: null, mergedPrs: 0, startSource: "unavailable", undatedRepositories: 0}
      };
      projects.set(row.project_id, project);
    }
    if (!project.repositories.includes(row.repository_full_name)) {
      // Count the development-wave aggregate once per repository: it repeats
      // on each chart-day SQL row but must never multiply the period total.
      project.repositories.push(row.repository_full_name);
      const mergedPrs = Number(row.lifetime_merged_count ?? 0);
      if (!Number.isSafeInteger(mergedPrs) || mergedPrs < 0) {
        throw new Error("Invalid lifetime merged PR count.");
      }
      project.lifetime.mergedPrs += mergedPrs;
      if (row.repository_started_on) {
        const startedOn = utcDay(row.repository_started_on);
        if (!project.lifetime.startedOn || startedOn < project.lifetime.startedOn) {
          project.lifetime.startedOn = startedOn;
          project.lifetime.startSource = row.start_source === "launch-window" ? "launch-window" :
            row.start_source === "first-pr" ? "first-pr" : "github";
        }
      } else {
        project.lifetime.undatedRepositories++;
      }
    }
    if (row.day !== null) {
      const day = utcDay(row.day);
      const count = Number(row.merged_count);
      if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid merged PR count.");
      const item = project.days.find((candidate) => candidate.day === day);
      if (item) item.merges += count;
      else project.days.push({ day, merges: count });
    }
  }
  return [...projects.values()].map((project) => ({
    ...project,
    repositories: project.repositories.sort(),
    days: project.days.sort((a, b) => a.day.localeCompare(b.day))
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * No extra GitHub API calls or timers. All observations were previously collected by
 * the explicit Refresh operation (or automatic sync, if the owner enables it).
 * Grouping in PostgreSQL avoids reading every historical PR row into Next.js.
 */
export async function loadDevelopmentVelocity(sharedClient?:import("pg").PoolClient): Promise<DevelopmentVelocityData> {
  if (!getRuntimeConfig().databaseUrl) return empty("unconfigured");
  try {
    const pool = sharedClient ?? getDatabasePool();
    const [history, checkpoint, marker] = await Promise.all([
      pool.query<VelocityRow>(
        // Anchor the current development wave to its earliest tracked new
        // primary repository created in late September or early October 2026.
        // GitHub metadata currently resolves this to FiresideChat (2026-10-05).
        // Older FOIA repositories remain in scope, but only merges from the
        // launch date forward count. Historical chart data stays unchanged.
        // All calculations share the existing single grouped database read.
        'WITH launch_anchor AS (' +
        "SELECT min((r.github_created_at AT TIME ZONE 'UTC')::date) AS launch_date " +
        'FROM repositories r JOIN project_repositories pr ON pr.repository_id=r.id ' +
        "WHERE pr.relationship='primary' AND NOT r.archived " +
        "AND r.github_created_at >= timestamptz '2026-09-20T00:00:00Z') " +
        ', lifetime AS (' +
        'SELECT g.repository_id, ' +
        "count(g.merged_at) FILTER (WHERE g.merged_at >= (a.launch_date::timestamp AT TIME ZONE 'UTC'))::integer AS lifetime_merged_count, " +
        "to_char(min(g.created_at) AT TIME ZONE 'UTC','YYYY-MM-DD') AS first_pr_created " +
        'FROM github_pull_requests g CROSS JOIN launch_anchor a GROUP BY g.repository_id) ' +
        'SELECT p.id::text AS project_id, p.display_name, r.full_name AS repository_full_name, ' +
        "CASE WHEN a.launch_date IS NULL THEN NULL " +
        "ELSE to_char(greatest(a.launch_date,coalesce((r.github_created_at AT TIME ZONE 'UTC')::date, " +
        "l.first_pr_created::date)),'YYYY-MM-DD') END AS repository_started_on, " +
        "CASE WHEN a.launch_date IS NULL THEN 'unavailable' " +
        "WHEN r.github_created_at IS NOT NULL AND (r.github_created_at AT TIME ZONE 'UTC')::date < a.launch_date THEN 'launch-window' " +
        "WHEN r.github_created_at IS NOT NULL THEN 'github' " +
        "WHEN l.first_pr_created IS NOT NULL THEN 'first-pr' " +
        "ELSE 'unavailable' END AS start_source, " +
        'COALESCE(l.lifetime_merged_count,0)::integer AS lifetime_merged_count, ' +
        "to_char(g.merged_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, " +
        'count(g.id)::integer AS merged_count ' +
        'FROM projects p ' +
        "JOIN project_repositories pr ON pr.project_id=p.id AND pr.relationship='primary' " +
        'JOIN repositories r ON r.id=pr.repository_id AND NOT r.archived ' +
        'CROSS JOIN launch_anchor a ' +
        'LEFT JOIN lifetime l ON l.repository_id=r.id ' +
        'LEFT JOIN github_pull_requests g ON g.repository_id=r.id ' +
        "AND g.merged_at >= (current_date - interval '364 days') " +
        "AND g.merged_at < (current_date + interval '1 day') " +
        'GROUP BY p.id,p.display_name,r.full_name,r.github_created_at, ' +
        'a.launch_date,l.lifetime_merged_count,l.first_pr_created,day ORDER BY p.display_name,day'
      ),
      pool.query<SyncRow>(
        'SELECT count(*)::integer AS total, ' +
        "count(*) FILTER (WHERE s.last_error IS NULL AND s.last_success_at > now() - interval '25 minutes' AND s.last_success_at <= now())::integer AS synchronized, " +
        'max(s.last_success_at) AS latest, min(s.last_success_at) AS oldest ' +
        'FROM repositories r ' +
        "JOIN project_repositories pr ON pr.repository_id=r.id AND pr.relationship='primary' " +
        'LEFT JOIN github_repository_sync s ON s.repository_id=r.id ' +
        'WHERE NOT r.archived'
      ),
      pool.query<{ effective_date: Date | string }>(
        "SELECT to_char(effective_date,'YYYY-MM-DD') AS effective_date FROM development_velocity_markers WHERE key='boardroom-rollout'"
      )
    ]);
    const sync = checkpoint.rows[0];
    return {
      source: "database",
      projects: normalizeVelocityRows(history.rows),
      boardroomStartDate: marker.rows[0] ? utcDay(marker.rows[0].effective_date) : null,
      observedAt: new Date().toISOString(),
      latestSuccessfulSyncAt: sync?.latest ? new Date(sync.latest).toISOString() : null,
      oldestSuccessfulSyncAt: sync?.oldest ? new Date(sync.oldest).toISOString() : null,
      trackedRepositories: Number(sync?.total ?? 0),
      synchronizedRepositories: Number(sync?.synchronized ?? 0)
    };
  } catch {
    return empty("error");
  }
}
