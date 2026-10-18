import { effectiveProjectStatus } from "./portfolio-statistics";
import { orderProjectsByHierarchy } from "./project-hierarchy";
import type { PortfolioProjectOverview } from "./portfolio-overview";
import type { ProjectStatus } from "./portfolio";

export const portfolioSorts = ["portfolio", "name", "completion-desc", "completion-asc", "underway"] as const;
export type PortfolioSort = typeof portfolioSorts[number];
export type PortfolioQuery = { search: string; status: ProjectStatus | "all"; sort: PortfolioSort };

export const defaultPortfolioQuery: PortfolioQuery = { search: "", status: "all", sort: "portfolio" };

export function queryPortfolio(projects: readonly PortfolioProjectOverview[], query: PortfolioQuery) {
  const terms = query.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = projects.filter((project) => {
    if (query.status !== "all" && effectiveProjectStatus(project.status, project.activity?.total ?? 0) !== query.status) return false;
    const searchable = [project.displayName, project.summary, project.repositoryFullName,
      ...project.repositories.map((repository) => repository.fullName),
      ...(project.features ?? []).flatMap((feature) => [feature.title, feature.description])].filter(Boolean).join(" ").toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
  return orderProjectsByHierarchy(filtered, (a, b) => {
    if (query.sort === "portfolio") {
      const engineFirst = Number(b.repositoryFullName === "neophilism/Engine-Room") - Number(a.repositoryFullName === "neophilism/Engine-Room");
      if (engineFirst !== 0) return engineFirst;
    }
    const nameOrder = a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id);
    if (query.sort === "completion-desc" || query.sort === "completion-asc") {
      // Unknown roadmaps are neither 0% complete nor 100% complete.
      const aKnown=a.planned>0&&a.completionMeasured!==false,bKnown=b.planned>0&&b.completionMeasured!==false;
      if (aKnown !== bKnown) return aKnown ? -1 : 1;
      if(!aKnown)return nameOrder;
      if (query.sort === "completion-desc") return b.percent - a.percent || nameOrder;
      return a.percent - b.percent || nameOrder;
    }
    if (query.sort === "underway") return (b.activity?.open??b.inProgress) - (a.activity?.open??a.inProgress) || nameOrder;
    return nameOrder;
  });
}

export function githubRepositoryUrl(fullName: string | undefined) {
  return fullName && /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(fullName)
    ? `https://github.com/${fullName}` : undefined;
}
