import type { ProjectStatus } from "./portfolio";
import type { PortfolioProjectOverview, PortfolioStatistics } from "./portfolio-overview";

export function calculatePortfolioStatistics(
  projects: readonly PortfolioProjectOverview[]
): PortfolioStatistics {
  const completedRoadmapPrs = projects.reduce((sum, project) => sum + project.completed, 0);
  const plannedRoadmapPrs = projects.reduce((sum, project) => sum + project.planned, 0);
  const activeStatuses = new Set<ProjectStatus>(["active-development", "beta", "live", "maintenance"]);

  return {
    projects: projects.length,
    activeProjects: projects.filter((project) => activeStatuses.has(project.status)).length,
    completedRoadmapPrs,
    plannedRoadmapPrs,
    percent: plannedRoadmapPrs === 0 ? 0 : Math.round(completedRoadmapPrs / plannedRoadmapPrs * 1000) / 10
  };
}

export function calculatePortfolioWorkload(projects: readonly PortfolioProjectOverview[]) {
  const statistics = calculatePortfolioStatistics(projects);
  return {
    ...statistics,
    underway: projects.reduce((sum, project) => sum + project.inProgress, 0),
    remaining: statistics.plannedRoadmapPrs - statistics.completedRoadmapPrs
  };
}
