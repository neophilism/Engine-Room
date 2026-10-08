import type {
  DevelopmentPlanGraph,
  Milestone,
  MilestoneStatus,
  PlannedPullRequest,
  ProjectStatus
} from "./portfolio";

export type MilestoneProgress = {
  milestoneId: string;
  status: MilestoneStatus;
  completed: number;
  planned: number;
  percent: number;
};

export type LifecycleCalculation = {
  milestones: MilestoneProgress[];
  projectStatus: ProjectStatus;
};

function roundPercent(completed: number, planned: number) {
  if (planned === 0) return 100;
  return Math.round((completed / planned) * 1000) / 10;
}

export function calculateMilestoneProgress(
  milestone: Milestone,
  plannedPullRequests: readonly PlannedPullRequest[]
): MilestoneProgress {
  const assigned = plannedPullRequests.filter(
    (plannedPullRequest) => plannedPullRequest.milestoneId === milestone.id
  );

  if (assigned.length !== milestone.plannedPrTotal) {
    throw new Error(
      `Milestone "${milestone.name}" expects ${milestone.plannedPrTotal} planned PRs but received ${assigned.length}.`
    );
  }

  const completed = assigned.filter(
    (plannedPullRequest) => plannedPullRequest.status === "merged"
  ).length;

  let status: MilestoneStatus;
  if (completed === milestone.plannedPrTotal) {
    status = "complete";
  } else if (milestone.status === "blocked") {
    status = "blocked";
  } else if (
    assigned.some(
      (plannedPullRequest) =>
        plannedPullRequest.status === "in-progress" ||
        plannedPullRequest.status === "merged"
    )
  ) {
    status = "active";
  } else {
    status = "planned";
  }

  return {
    milestoneId: milestone.id,
    status,
    completed,
    planned: milestone.plannedPrTotal,
    percent: roundPercent(completed, milestone.plannedPrTotal)
  };
}

export function calculateProjectLifecycleState(
  graph: DevelopmentPlanGraph,
  currentStatus: ProjectStatus
): LifecycleCalculation {
  const milestones = graph.milestones.map((milestone) =>
    calculateMilestoneProgress(milestone, graph.plannedPullRequests)
  );

  if (["archived", "paused", "beta", "live", "maintenance"].includes(currentStatus)) {
    return { milestones, projectStatus: currentStatus };
  }

  if (milestones.every((milestone) => milestone.status === "complete")) {
    return { milestones, projectStatus: "complete" };
  }

  if (
    milestones.some(
      (milestone) =>
        milestone.status === "active" ||
        milestone.status === "complete" ||
        milestone.status === "blocked"
    )
  ) {
    return { milestones, projectStatus: "active-development" };
  }

  return { milestones, projectStatus: "planned" };
}
