import { getRuntimeConfig } from "../config/env";
import { getDatabasePool } from "./database";
import type { DevelopmentVelocityData, VelocityProject } from "../domain/development-velocity";

type VelocityRow = {
  project_id: string;
  display_name: string;
  repository_full_name: string;
  day: Date | string | null;
  merged_count: number | string;
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
      project = { id: row.project_id, name: row.display_name, repositories: [], days: [] };
      projects.set(row.project_id, project);
    }
    if (!project.repositories.includes(row.repository_full_name)) {
      project.repositories.push(row.repository_full_name);
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
export async function loadDevelopmentVelocity(): Promise<DevelopmentVelocityData> {
  if (!getRuntimeConfig().databaseUrl) return empty("unconfigured");
  try {
    const pool = getDatabasePool();
    const [history, checkpoint, marker] = await Promise.all([
      pool.query<VelocityRow>(
        'SELECT p.id::text AS project_id, p.display_name, ' +
        'r.full_name AS repository_full_name, ' +
        "(g.merged_at AT TIME ZONE 'UTC')::date AS day, " +
        'count(g.id)::integer AS merged_count ' +
        'FROM projects p ' +
        "JOIN project_repositories pr ON pr.project_id=p.id AND pr.relationship='primary' " +
        'JOIN repositories r ON r.id=pr.repository_id AND NOT r.archived ' +
        'LEFT JOIN github_pull_requests g ON g.repository_id=r.id ' +
        "AND g.merged_at >= (current_date - interval '364 days') " +
        "AND g.merged_at < (current_date + interval '1 day') " +
        'GROUP BY p.id,p.display_name,r.full_name,day ORDER BY p.display_name,day'
      ),
      pool.query<SyncRow>(
        'SELECT count(*)::integer AS total, ' +
        'count(s.last_success_at)::integer AS synchronized, ' +
        'max(s.last_success_at) AS latest, min(s.last_success_at) AS oldest ' +
        'FROM repositories r ' +
        "JOIN project_repositories pr ON pr.repository_id=r.id AND pr.relationship='primary' " +
        'LEFT JOIN github_repository_sync s ON s.repository_id=r.id ' +
        'WHERE NOT r.archived'
      ),
      pool.query<{ effective_date: Date | string }>(
        "SELECT effective_date FROM development_velocity_markers WHERE key='boardroom-rollout'"
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
