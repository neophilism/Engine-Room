export const repositoryVisibilities = ["public", "private", "internal"] as const;
export type RepositoryVisibility = (typeof repositoryVisibilities)[number];

export const projectStatuses = [
  "planned",
  "active-development",
  "beta",
  "live",
  "maintenance",
  "complete",
  "paused",
  "archived"
] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const developmentPlanStatuses = ["draft", "approved", "superseded", "retired"] as const;
export type DevelopmentPlanStatus = (typeof developmentPlanStatuses)[number];

export const milestoneStatuses = ["planned", "active", "complete", "blocked"] as const;
export type MilestoneStatus = (typeof milestoneStatuses)[number];

export const plannedPullRequestStatuses = ["planned", "in-progress", "merged", "skipped"] as const;
export type PlannedPullRequestStatus = (typeof plannedPullRequestStatuses)[number];

export type Repository = {
  id: string;
  githubRepositoryId: number;
  ownerLogin: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  visibility: RepositoryVisibility;
  archived: boolean;
};

export type Project = {
  id: string;
  slug: string;
  displayName: string;
  summary?: string;
  status: ProjectStatus;
};

export type ProjectRepository = {
  projectId: string;
  repositoryId: string;
  relationship: "primary" | "supporting";
};

export type DevelopmentPlan = {
  id: string;
  projectId: string;
  version: number;
  status: DevelopmentPlanStatus;
  title: string;
  summary?: string;
  plannedPrTotal: number;
  approvedAt?: string;
};

export type Milestone = {
  id: string;
  developmentPlanId: string;
  ordinal: number;
  name: string;
  description?: string;
  plannedPrTotal: number;
  status: MilestoneStatus;
};

export type PlannedPullRequest = {
  id: string;
  developmentPlanId: string;
  milestoneId?: string;
  repositoryId?: string;
  ordinal: number;
  title: string;
  description?: string;
  status: PlannedPullRequestStatus;
  githubPrNumber?: number;
  mergedAt?: string;
};

export type DevelopmentPlanGraph = {
  plan: DevelopmentPlan;
  milestones: readonly Milestone[];
  plannedPullRequests: readonly PlannedPullRequest[];
};

export type PlanValidationError = {
  code:
    | "invalid-plan-total"
    | "invalid-milestone-total"
    | "wrong-plan"
    | "unknown-milestone"
    | "milestone-count-mismatch"
    | "plan-count-mismatch"
    | "duplicate-pr-ordinal"
    | "duplicate-milestone-ordinal"
    | "merged-without-timestamp";
  message: string;
};

export type RoadmapProgress = {
  completed: number;
  planned: number;
  remaining: number;
  percent: number;
};

function duplicateNumbers(values: readonly number[]) {
  const seen = new Set<number>();
  const duplicates = new Set<number>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export function validateDevelopmentPlanGraph(graph: DevelopmentPlanGraph): PlanValidationError[] {
  const { plan, milestones, plannedPullRequests } = graph;
  const errors: PlanValidationError[] = [];

  if (!Number.isInteger(plan.plannedPrTotal) || plan.plannedPrTotal < 1) {
    errors.push({
      code: "invalid-plan-total",
      message: "A development plan must declare at least one planned PR."
    });
  }

  for (const milestone of milestones) {
    if (milestone.developmentPlanId !== plan.id) {
      errors.push({
        code: "wrong-plan",
        message: `Milestone "${milestone.name}" belongs to a different development plan.`
      });
    }
    if (!Number.isInteger(milestone.plannedPrTotal) || milestone.plannedPrTotal < 0) {
      errors.push({
        code: "invalid-milestone-total",
        message: `Milestone "${milestone.name}" has an invalid planned PR total.`
      });
    }
  }

  const duplicateMilestoneOrdinals = duplicateNumbers(milestones.map((milestone) => milestone.ordinal));
  if (duplicateMilestoneOrdinals.length > 0) {
    errors.push({
      code: "duplicate-milestone-ordinal",
      message: `Duplicate milestone ordinals: ${duplicateMilestoneOrdinals.join(", ")}.`
    });
  }

  const milestonesById = new Map(milestones.map((milestone) => [milestone.id, milestone]));

  for (const plannedPr of plannedPullRequests) {
    if (plannedPr.developmentPlanId !== plan.id) {
      errors.push({
        code: "wrong-plan",
        message: `Planned PR #${plannedPr.ordinal} belongs to a different development plan.`
      });
    }

    if (plannedPr.milestoneId && !milestonesById.has(plannedPr.milestoneId)) {
      errors.push({
        code: "unknown-milestone",
        message: `Planned PR #${plannedPr.ordinal} references an unknown milestone.`
      });
    }

    if (plannedPr.status === "merged" && !plannedPr.mergedAt) {
      errors.push({
        code: "merged-without-timestamp",
        message: `Merged planned PR #${plannedPr.ordinal} is missing mergedAt.`
      });
    }
  }

  const duplicatePrOrdinals = duplicateNumbers(plannedPullRequests.map((plannedPr) => plannedPr.ordinal));
  if (duplicatePrOrdinals.length > 0) {
    errors.push({
      code: "duplicate-pr-ordinal",
      message: `Duplicate planned PR ordinals: ${duplicatePrOrdinals.join(", ")}.`
    });
  }

  for (const milestone of milestones) {
    const actual = plannedPullRequests.filter((plannedPr) => plannedPr.milestoneId === milestone.id).length;
    if (actual !== milestone.plannedPrTotal) {
      errors.push({
        code: "milestone-count-mismatch",
        message: `Milestone "${milestone.name}" declares ${milestone.plannedPrTotal} planned PRs but contains ${actual}.`
      });
    }
  }

  if (plannedPullRequests.length !== plan.plannedPrTotal) {
    errors.push({
      code: "plan-count-mismatch",
      message: `Development plan declares ${plan.plannedPrTotal} planned PRs but contains ${plannedPullRequests.length}.`
    });
  }

  return errors;
}

export function calculateRoadmapProgress(graph: DevelopmentPlanGraph): RoadmapProgress {
  const errors = validateDevelopmentPlanGraph(graph);
  if (errors.length > 0) {
    throw new Error(`Invalid development plan graph: ${errors.map((error) => error.message).join(" ")}`);
  }

  const completed = graph.plannedPullRequests.filter((plannedPr) => plannedPr.status === "merged").length;
  const planned = graph.plan.plannedPrTotal;
  const percent = Math.round((completed / planned) * 1000) / 10;

  return {
    completed,
    planned,
    remaining: planned - completed,
    percent
  };
}
