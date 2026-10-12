import type { ProjectStatus } from "../domain/portfolio";
import type {
  PortfolioOverviewData,
  PortfolioProjectOverview,
  PortfolioRepositoryProgress
} from "../domain/portfolio-overview";

export type {
  PortfolioOverviewData,
  PortfolioProjectOverview,
  PortfolioRepositoryProgress,
  PortfolioStatistics
} from "../domain/portfolio-overview";
import { calculatePortfolioStatistics } from "../domain/portfolio-statistics";
export { calculatePortfolioStatistics } from "../domain/portfolio-statistics";
import { getRuntimeConfig, type EnvironmentSource } from "../config/env";
import { getDatabasePool } from "./database";
import { loadCurrentFeatures } from "./project-features";
import { loadProjectMonitorData } from './live-monitor';
import {loadProjectUpdates} from './project-update';

export type PortfolioOverviewRow = {
  id: string;
  display_name: string;
  slug?: string;
  summary?: string | null;
  status: ProjectStatus;
  repository_full_name: string | null;
  repository_html_url: string | null;
  planned_pr_total: number | null;
  completed_count: string | number;
  in_progress_count: string | number;
  unmapped_count?:string|number;
};

export type PortfolioRepositoryRow = {
  project_id: string;
  repository_id: string;
  full_name: string;
  html_url: string;
  planned_count: string | number;
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
      slug: row.slug,
      summary: row.summary ?? undefined,
      status: row.status,
      repositoryFullName: row.repository_full_name ?? undefined,
      repositoryUrl: row.repository_html_url ?? undefined,
      completed,
      inProgress,
      planned,
      percent: percentage(completed, planned),
      completionMeasured:planned>0&&Number(row.unmapped_count||0)===0,
      repositories: []
    };
  });
}

export function attachRepositoryProgress(
  projects: readonly PortfolioProjectOverview[],
  rows: readonly PortfolioRepositoryRow[]
): PortfolioProjectOverview[] {
  const repositoriesByProject = new Map<string, PortfolioRepositoryProgress[]>();

  for (const row of rows) {
    const completed = Number(row.completed_count);
    const inProgress = Number(row.in_progress_count);
    const planned = Number(row.planned_count);
    const repository: PortfolioRepositoryProgress = {
      id: row.repository_id,
      fullName: row.full_name,
      htmlUrl: row.html_url,
      completed,
      inProgress,
      planned,
      percent: percentage(completed, planned)
    };

    const current = repositoriesByProject.get(row.project_id) ?? [];
    current.push(repository);
    repositoriesByProject.set(row.project_id, current);
  }

  return projects.map((project) => ({
    ...project,
    repositories: repositoriesByProject.get(project.id) ?? []
  }));
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
    const client = await getDatabasePool(source).connect();
    try {
      await client.query("begin isolation level repeatable read read only");
      const projectResult = await client.query<PortfolioOverviewRow>(
        `select
           p.id,
           p.display_name,
           p.slug,
           p.summary,
           p.status,
           r.full_name as repository_full_name,
           r.html_url as repository_html_url,
           dp.planned_pr_total,
           count(ppr.id) filter (where gpr.merged_at is not null) as completed_count,
           count(ppr.id) filter (where gpr.state = 'open' and gpr.merged_at is null) as in_progress_count,
           count(ppr.id) filter (where gpr.id IS NULL) AS unmapped_count
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
         left join github_pull_requests gpr
           on gpr.repository_id = ppr.repository_id and gpr.number = ppr.github_pr_number
         group by
           p.id,
           p.display_name,
           p.summary,
           p.status,
           p.slug,
           r.full_name,
           r.default_branch,
           r.html_url,
           dp.planned_pr_total
         order by
           case when p.slug = 'engine-room' then 0 else 1 end,
           p.display_name`
      );
      const repositoryResult = await client.query<PortfolioRepositoryRow>(
        `select
           p.id as project_id,
           r.id as repository_id,
           r.full_name,
           r.html_url,
           count(ppr.id) as planned_count,
           count(ppr.id) filter (where gpr.merged_at is not null) as completed_count,
           count(ppr.id) filter (where gpr.state = 'open' and gpr.merged_at is null) as in_progress_count
         from projects p
         join development_plans dp
           on dp.project_id = p.id
          and dp.status = 'approved'
         join planned_pull_requests ppr
           on ppr.development_plan_id = dp.id
         join repositories r
           on r.id = ppr.repository_id
         left join github_pull_requests gpr
           on gpr.repository_id = ppr.repository_id and gpr.number = ppr.github_pr_number
         group by
           p.id,
           r.id,
           r.full_name,
           r.default_branch,
           r.html_url
         order by
           p.id,
           r.full_name`
      );

    let projects = attachRepositoryProgress(
      normalizePortfolioRows(projectResult.rows),
      repositoryResult.rows
    );
    const features = await loadCurrentFeatures(client);
    projects = projects.map((project) => ({ ...project, features: features.filter((feature) => feature.projectId === project.id) }));
    const monitor=await loadProjectMonitorData(client);
    const latestUpdates=await loadProjectUpdates(client);
    projects=projects.map(project=>({...project,latestUpdate:latestUpdates.get(project.id)}));
    projects=projects.map(project=>{
      const plan=monitor.plans.get(project.id);
      const structured=!!plan?.documents.some(doc=>doc.path==="registry/prs.json");
      if(structured && plan){
        const planned=plan.original+plan.added,completed=plan.originalComplete+plan.addedComplete;
        return {...project,planned,completed,percent:percentage(completed,planned),
          inProgress:plan.items.filter(item=>item.state==="in-progress").length,
          completionMeasured:planned>0&&plan.unmapped===0,
          activity:monitor.summaries.get(project.id),pullRequests:monitor.pullRequests.get(project.id)||[],sourcePlan:plan};
      }
      return {...project,...(!project.planned&&plan?.original?{planned:plan.original,completed:plan.originalComplete,percent:percentage(plan.originalComplete,plan.original),
        inProgress:plan.items.filter(item=>item.scope==='original'&&item.state==='in-progress').length}:{}),
        completionMeasured:project.planned>0?project.completionMeasured!==false:!!plan?.original&&!plan.items.some(item=>item.scope==='original'&&item.state==='unmapped'),
        activity:monitor.summaries.get(project.id),pullRequests:monitor.pullRequests.get(project.id)||[],sourcePlan:plan};
    });

    const overview: PortfolioOverviewData = {
      source: "database",
      projects,
      statistics: calculatePortfolioStatistics(projects)
    };
    await client.query("commit");
    return overview;
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
  } catch {
    return emptyOverview("error");
  }
}

