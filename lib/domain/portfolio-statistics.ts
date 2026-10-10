import type { ProjectStatus } from "./portfolio";
import type { PortfolioProjectOverview, PortfolioStatistics } from "./portfolio-overview";
import { summarizePlannedProgress } from "./planned-progress";

export function calculatePortfolioStatistics(
  projects: readonly PortfolioProjectOverview[]
): PortfolioStatistics {
  // ALL documented planned units form the denominator, including those
  // without a GitHub PR yet. No open/closed PR totals are used.
  const progress = projects.map(summarizePlannedProgress).filter((p) => p !== null);
  const completedRoadmapPrs = progress.reduce((sum, p) => sum + p.completed, 0);
  const plannedRoadmapPrs = progress.reduce((sum, p) => sum + p.planned, 0);
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
    underway: projects.reduce((sum, project) => sum + (summarizePlannedProgress(project)?.inProgress ?? 0), 0),
    notStarted: projects.reduce((sum, project) => sum + (summarizePlannedProgress(project)?.notStarted ?? 0), 0),
    remaining: statistics.plannedRoadmapPrs - statistics.completedRoadmapPrs
  };
}
