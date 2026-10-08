import type { ProjectStatus } from "../domain/portfolio";
import { getRuntimeConfig, type EnvironmentSource } from "../config/env";
import { getDatabasePool } from "./database";

export type PortfolioProjectOverview = {
  id: string;
  displayName: string;
  status: ProjectStatus;
  repositoryFullName?: string;
  repositoryUrl?: string;
  completed: number;
  inProgress: number;
  planned: number;
  percent: number;
};

export type PortfolioStatistics = {
  projects: number;
  activeProjects: number;
  completedRoadmapPrs: number;
  plannedRoadmapPrs: number;
  percent: number;
};

export type PortfolioOverviewData = {
  source: "database" | "unconfigured" | "error";
  projects: PortfolioProjectOverview[];
  statistics: PortfolioStatistics;
};

export type PortfolioOverviewRow = {
  id: string;
  display_name: string;
  status: ProjectStatus;
  repository_full_name: string | null;
  repository_html_url: string | null;
  planned_pr_total: number | null;
  completed_count: string | number;
  in_progress_count: string | number;
};

function percentage(completed: number, planned: number) {
  if (planned <= 0) return 0;
  return Math.round((completed / planned) * 1000) / 10;
}

export function normalizePortfolioRows(
  rows: readonly PortfolioOverviewRow[]
): PortfolioProjectOverview[] {
  return rows.map((row) => {
    const completed = Number(row.completed_count);
    const inProgress = Number(row.in_progress_count);
    const planned = Number(row.planned_pr_total ?? 0);

    return {
      id: row.id,
      displayName: row.display_name,
      status: row.status,
      repositoryFullName: row.repository_full_name ?? undefined,
      repositoryUrl: row.repository_html_url ?? undefined,
      completed,
      inProgress,
      planned,
      percent: percentage(completed, planned)
    };
  });
}

export function calculatePortfolioStatistics(
  projects: readonly PortfolioProjectOverview[]
): PortfolioStatistics {
  const completedRoadmapPrs = projects.reduce(
    (sum, project) => sum + project.completed,
    0
  );
  const plannedRoadmapPrs = projects.reduce(
    (sum, project) => sum + project.planned,
    0
  );
  const activeStatuses = new Set<ProjectStatus>([
    "active-development",
    "beta",
    "live",
    "maintenance"
  ]);

  return {
    projects: projects.length,
    activeProjects: projects.filter((project) =>
      activeStatuses.has(project.status)
    ).length,
    completedRoadmapPrs,
    plannedRoadmapPrs,
    percent: percentage(completedRoadmapPrs, plannedRoadmapPrs)
  };
}

function emptyOverview(
  source: PortfolioOverviewData["source"]
): PortfolioOverviewData {
  return {
    source,
    projects: [],
    statistics: {
      projects: 0,
      activeProjects: 0,
      completedRoadmapPrs: 0,
      plannedRoadmapPrs: 0,
      percent: 0
    }
  };
}

export async function loadPortfolioOverview(
  source: EnvironmentSource = process.env
): Promise<PortfolioOverviewData> {
  if (!getRuntimeConfig(source).databaseUrl) {
    return emptyOverview("unconfigured");
  }

  try {
    const result = await getDatabasePool(source).query<PortfolioOverviewRow>(
      `select
         p.id,
         p.display_name,
         p.status,
         r.full_name as repository_full_name,
         r.html_url as repository_html_url,
         dp.planned_pr_total,
         count(ppr.id) filter (where ppr.status = 'merged') as completed_count,
         count(ppr.id) filter (where ppr.status = 'in-progress') as in_progress_count
       from projects p
       left join project_repositories pr
         on pr.project_id = p.id
        and pr.relationship = 'primary'
       left join repositories r
         on r.id = pr.repository_id
       left join development_plans dp
         on dp.project_id = p.id
        and dp.status = 'approved'
       left join planned_pull_requests ppr
         on ppr.development_plan_id = dp.id
       group by
         p.id,
         p.display_name,
         p.status,
         p.slug,
         r.full_name,
         r.html_url,
         dp.planned_pr_total
       order by
         case when p.slug = 'engine-room' then 0 else 1 end,
         p.display_name`
    );

    const projects = normalizePortfolioRows(result.rows);
    return {
      source: "database",
      projects,
      statistics: calculatePortfolioStatistics(projects)
    };
  } catch {
    return emptyOverview("error");
  }
}
