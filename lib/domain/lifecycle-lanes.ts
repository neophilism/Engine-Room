import type { MachineState } from "../design/theme";
import { projectStatuses, type ProjectStatus } from "./portfolio";
import type { PortfolioProjectOverview } from "./portfolio-overview";

export const lifecycleStages: Record<ProjectStatus, { label: string; state: MachineState; description: string }> = {
  planned: { label: "Planning", state: "neutral", description: "Approved work is being organized." },
  "active-development": { label: "Development", state: "active", description: "Implementation is underway." },
  beta: { label: "Beta", state: "active", description: "The project is in its beta stage." },
  live: { label: "Live", state: "live", description: "The project is designated live." },
  maintenance: { label: "Maintenance", state: "active", description: "Ongoing support and improvements." },
  complete: { label: "Roadmap complete", state: "complete", description: "Roadmap work is complete; deployment readiness is separate." },
  paused: { label: "Paused", state: "warning", description: "Work is explicitly paused." },
  archived: { label: "Archived", state: "offline", description: "The project is archived." }
};

export function groupLifecycleLanes(projects: readonly PortfolioProjectOverview[]) {
  return projectStatuses.map((status) => ({
    status,
    ...lifecycleStages[status],
    projects: projects.filter((project) => project.status === status)
      .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id))
  }));
}
