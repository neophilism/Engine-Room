import type {
  DevelopmentPlanGraph,
  PlannedPullRequest,
  RoadmapProgress
} from "./portfolio";
import { calculateRoadmapProgress } from "./portfolio";
import type { SynchronizedPullRequest } from "../github/types";

export type PlannedPrCompletionResult = {
  plannedPullRequests: PlannedPullRequest[];
  progress: RoadmapProgress;
};

export function applySynchronizedPullRequests(
  graph: DevelopmentPlanGraph,
  synchronizedPullRequests: readonly SynchronizedPullRequest[]
): PlannedPrCompletionResult {
  const byNumber = new Map<number, SynchronizedPullRequest>();

  for (const pullRequest of synchronizedPullRequests) {
    if (byNumber.has(pullRequest.number)) {
      throw new Error(
        `Ambiguous synchronized PR #${pullRequest.number}; repository scope is required.`
      );
    }
    byNumber.set(pullRequest.number, pullRequest);
  }

  const plannedPullRequests = graph.plannedPullRequests.map((plannedPr) => {
    if (!plannedPr.githubPrNumber) return { ...plannedPr, status: "planned" as const };

    const live = byNumber.get(plannedPr.githubPrNumber);
    if (!live) return { ...plannedPr, status: "planned" as const, mergedAt: undefined };

    if (live.mergedAt) {
      return {
        ...plannedPr,
        status: "merged" as const,
        mergedAt: live.mergedAt
      };
    }

    if (live.state === "open") {
      return {
        ...plannedPr,
        status: "in-progress" as const,
        mergedAt: undefined
      };
    }

    return {
      ...plannedPr,
      status: "planned" as const,
      mergedAt: undefined
    };
  });

  const updatedGraph: DevelopmentPlanGraph = {
    ...graph,
    plannedPullRequests
  };

  return {
    plannedPullRequests,
    progress: calculateRoadmapProgress(updatedGraph)
  };
}
