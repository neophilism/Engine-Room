import { describe, expect, it } from "vitest";
import { calculateProjectReadiness, releaseGates, validateReleaseEvidence, type ReleaseEvidence } from "./project-readiness";
import type { ProjectDashboardData } from "./project-dashboard";

const now = new Date("2026-10-08T00:00:00Z"), target = { commitSha: "a".repeat(40), environment: "production" };
const data: Pick<ProjectDashboardData, "graph" | "progress" | "milestones"> = { graph: { plan: { id: "plan", projectId: "p", version: 1, status: "approved", title: "Plan", plannedPrTotal: 1 },
  milestones: [], plannedPullRequests: [{ id: "one", developmentPlanId: "plan", ordinal: 1, title: "Work", repositoryId: "repo", githubPrNumber: 1, status: "merged", mergedAt: "2026-10-07T00:00:00Z" }] },
  progress: { planned: 1, completed: 1, remaining: 0, percent: 100 }, milestones: [] };
const evidence: ReleaseEvidence[] = releaseGates.map((gate) => ({ ...target, gate, status: "passed", evidenceUrl: "https://example.org/evidence", observedAt: "2026-10-07T00:00:00Z", expiresAt: "2026-10-09T00:00:00Z" }));

describe("project release readiness", () => {
  it("requires every gate to have current evidence for the selected immutable target", () => {
    expect(calculateProjectReadiness(data, [], target, evidence, now).status).toBe("ready");
    expect(calculateProjectReadiness(data, [], target, [], now).status).toBe("not-assessed");
    expect(calculateProjectReadiness(data, [], undefined, evidence, now).status).toBe("not-assessed");
    expect(calculateProjectReadiness({ ...data, progress: undefined }, [], target, evidence, now).status).toBe("blocked");
  });
  it("does not carry passing evidence across commits, environments, or expiration", () => {
    const invalid = evidence.map((item) => ({ ...item, commitSha: "b".repeat(40) }));
    expect(calculateProjectReadiness(data, [], target, invalid, now).gates.every((gate) => gate.status === "unknown")).toBe(true);
    expect(calculateProjectReadiness(data, [], { ...target, environment: "staging" }, evidence, now).status).toBe("not-assessed");
    expect(calculateProjectReadiness(data, [], target, evidence, new Date("2026-10-10T00:00:00Z")).status).toBe("not-assessed");
  });
  it("blocks failed gates, incomplete work, and recorded blockers", () => {
    expect(calculateProjectReadiness(data, [], target, [{ ...evidence[0], status: "failed" }, ...evidence.slice(1)], now).status).toBe("blocked");
    expect(calculateProjectReadiness({ ...data, progress: { planned: 1, completed: 0, remaining: 1, percent: 0 } }, [], target, evidence, now).status).toBe("blocked");
    const readiness = calculateProjectReadiness(data, [{ key: "risk", title: "Operator blocker", severity: "high", blocking: true, state: "open" }], target, evidence, now);
    expect(readiness.status).toBe("blocked"); expect(readiness.nextActions).toContain("Resolve blocker: Operator blocker");
  });
  it("rejects mutable targets, invalid times, and credential-bearing evidence URLs", () => {
    expect(() => validateReleaseEvidence({ ...evidence[0], commitSha: "main" })).toThrow("immutable commit");
    expect(() => validateReleaseEvidence({ ...evidence[0], expiresAt: "2020-01-01T00:00:00Z" })).toThrow("timestamps");
    expect(() => validateReleaseEvidence({ ...evidence[0], evidenceUrl: "https://secret:password@example.org" })).toThrow("credentials");
  });
});
