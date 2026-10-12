import type { DevelopmentPlanGraph, Project, Repository } from "../domain/portfolio";
import { calculateRoadmapProgress } from "../domain/portfolio";
import { calculateMilestoneProgress } from "../domain/milestone-lifecycle";
import type { ProjectDashboardData } from "../domain/project-dashboard";
import { getRuntimeConfig, type EnvironmentSource } from "../config/env";
import { getDatabasePool } from "./database";
import { loadCurrentFeatures } from "./project-features";
import { loadProjectActivity } from "./development-activity";
import { loadProjectMonitorData } from "./live-monitor";
import { loadProjectReadiness } from "./project-readiness";
import {loadProjectUpdates} from './project-update';
import {loadProjectSecurityStatuses} from './security-status';

type ProjectRow = { id: string; slug: string; display_name: string; summary: string | null; status: Project["status"] };
type RepositoryRow = { id: string; github_repository_id: string | number; owner_login: string; name: string; full_name: string; html_url: string; default_branch: string; visibility: Repository["visibility"]; archived: boolean };
type PlanRow = { id: string; project_id: string; version: number; title: string; summary: string | null; planned_pr_total: number; approved_at: Date | string };
type MilestoneRow = { id: string; development_plan_id: string; ordinal: number; name: string; description: string | null; planned_pr_total: number; status: DevelopmentPlanGraph["milestones"][number]["status"] };
type PlannedPrRow = { id: string; development_plan_id: string; milestone_id: string | null; repository_id: string | null; ordinal: number; title: string; description: string | null; status: DevelopmentPlanGraph["plannedPullRequests"][number]["status"]; github_pr_number: number | null; merged_at: Date | string | null; completion_unverified?:boolean };

function iso(value: Date | string | null) { return value === null ? undefined : new Date(value).toISOString(); }
function empty(source: ProjectDashboardData["source"]): ProjectDashboardData { return { source, project: null, repositories: [], milestones: [] }; }

export function normalizeProjectDashboard(projectRow: ProjectRow, repositoryRows: readonly RepositoryRow[], planRow: PlanRow | undefined,
  milestoneRows: readonly MilestoneRow[], plannedPrRows: readonly PlannedPrRow[]): ProjectDashboardData {
  const project: Project = { id: projectRow.id, slug: projectRow.slug, displayName: projectRow.display_name, summary: projectRow.summary ?? undefined, status: projectRow.status };
  const repositories = repositoryRows.map((row): Repository => ({ id: row.id, githubRepositoryId: Number(row.github_repository_id), ownerLogin: row.owner_login,
    name: row.name, fullName: row.full_name, htmlUrl: row.html_url, defaultBranch: row.default_branch, visibility: row.visibility, archived: row.archived }));
  if (!planRow) return { source: "database", project, repositories, milestones: [] };
  const graph: DevelopmentPlanGraph = {
    plan: { id: planRow.id, projectId: planRow.project_id, version: planRow.version, status: "approved", title: planRow.title,
      summary: planRow.summary ?? undefined, plannedPrTotal: planRow.planned_pr_total, approvedAt: iso(planRow.approved_at) },
    milestones: milestoneRows.map((row) => ({ id: row.id, developmentPlanId: row.development_plan_id, ordinal: row.ordinal, name: row.name,
      description: row.description ?? undefined, plannedPrTotal: row.planned_pr_total, status: row.status })),
    plannedPullRequests: plannedPrRows.map((row) => ({ id: row.id, developmentPlanId: row.development_plan_id, milestoneId: row.milestone_id ?? undefined,
      repositoryId: row.repository_id ?? undefined, ordinal: row.ordinal, title: row.title, description: row.description ?? undefined, status: row.status,
      githubPrNumber: row.github_pr_number ?? undefined, mergedAt: iso(row.merged_at) }))
  };
  const unverifiedRoadmapItems=plannedPrRows.filter(row=>!row.repository_id||!row.github_pr_number||row.completion_unverified).length;
  return { source: "database", project, repositories, graph, progress: calculateRoadmapProgress(graph),
    completionMeasured:planRow.planned_pr_total>0&&unverifiedRoadmapItems===0,unverifiedRoadmapItems,
    milestones: graph.milestones.map((milestone) => calculateMilestoneProgress(milestone, graph.plannedPullRequests)) };
}

export async function loadProjectDashboard(slug: string, source: EnvironmentSource = process.env): Promise<ProjectDashboardData> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return empty("database");
  if (!getRuntimeConfig(source).databaseUrl) return empty("unconfigured");
  try {
    const client = await getDatabasePool(source).connect();
    try {
      await client.query("begin isolation level repeatable read read only");
      const result = await client.query<ProjectRow>("select id, slug, display_name, summary, status from projects where slug = $1", [slug]);
      const project = result.rows[0];
      if (!project) { await client.query("commit"); return empty("database"); }
      const repositories = await client.query<RepositoryRow>(`select r.* from repositories r join project_repositories pr on pr.repository_id = r.id
        where pr.project_id = $1 order by case when pr.relationship = 'primary' then 0 else 1 end, r.full_name`, [project.id]);
      const plans = await client.query<PlanRow>("select * from development_plans where project_id = $1 and status = 'approved'", [project.id]);
      const plan = plans.rows[0];
      let milestones: MilestoneRow[] = [], plannedPrs: PlannedPrRow[] = [];
      if (plan) {
        milestones = (await client.query<MilestoneRow>("select * from milestones where development_plan_id = $1 order by ordinal", [plan.id])).rows;
        plannedPrs = (await client.query<PlannedPrRow>(`select ppr.id, ppr.development_plan_id, ppr.milestone_id, ppr.repository_id, ppr.ordinal,
          ppr.title, ppr.description, ppr.github_pr_number,
          (gpr.id IS NULL) AS completion_unverified,
          gpr.merged_at AS merged_at,
          CASE WHEN gpr.merged_at IS NOT NULL THEN 'merged'
            WHEN gpr.state = 'open' THEN 'in-progress'
            WHEN ppr.status = 'skipped' THEN 'skipped' ELSE 'planned' END AS status
          from planned_pull_requests ppr left join github_pull_requests gpr
            on gpr.repository_id = ppr.repository_id and gpr.number = ppr.github_pr_number
          where ppr.development_plan_id = $1 order by ppr.ordinal`, [plan.id])).rows;
      }
      const dashboard = normalizeProjectDashboard(project, repositories.rows, plan, milestones, plannedPrs);
      dashboard.latestUpdate=(await loadProjectUpdates(client,project.id)).get(project.id);
      dashboard.securityStatuses=(await loadProjectSecurityStatuses(client,project.id)).get(project.id)||[];
      const monitor=await loadProjectMonitorData(client,project.id);
      dashboard.sourcePlan=monitor.plans.get(project.id);
      dashboard.pullRequests=monitor.pullRequests.get(project.id)||[];
      dashboard.features = await loadCurrentFeatures(client, project.id);
      dashboard.activities = await loadProjectActivity(client, project.id);
      dashboard.readiness = await loadProjectReadiness(client, project.id, dashboard);
      await client.query("commit");
      return dashboard;
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
  } catch { return empty("error"); }
}

