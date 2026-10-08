import type { ProjectDashboardData } from "./project-dashboard";

export const releaseGates = ["tests", "build", "responsive", "accessibility", "performance", "security", "deployment", "observability", "backup-restore"] as const;
export type ReleaseGate = typeof releaseGates[number];
export type ProjectRisk = { key: string; title: string; severity: "low" | "medium" | "high" | "critical"; blocking: boolean; state: "open" | "resolved" };
export type ReleaseTarget = { commitSha: string; environment: string };
export type ReleaseEvidence = ReleaseTarget & { gate: ReleaseGate; status: "passed" | "failed"; evidenceUrl: string; observedAt: string; expiresAt: string };
export type ProjectReadiness = { status: "ready" | "blocked" | "not-assessed"; risks: ProjectRisk[]; target?: ReleaseTarget;
  gates: Array<{ gate: ReleaseGate; status: "passed" | "failed" | "unknown"; evidenceUrl?: string }>;
  nextActions: string[]; evaluatedAt: string };

export function calculateProjectReadiness(data: Pick<ProjectDashboardData, "graph" | "progress" | "milestones">,
  risks: readonly ProjectRisk[], target: ReleaseTarget | undefined, evidence: readonly ReleaseEvidence[], now = new Date()): ProjectReadiness {
  const time = now.getTime();
  const gates = releaseGates.map((gate) => {
    const latest = evidence.filter((item) => item.gate === gate && target && item.commitSha === target.commitSha && item.environment === target.environment)
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
    const valid = latest && latest.evidenceUrl.startsWith("https://") && new Date(latest.observedAt).getTime() <= time && new Date(latest.expiresAt).getTime() > time;
    return { gate, status: valid ? latest.status : "unknown" as const, evidenceUrl: valid ? latest.evidenceUrl : undefined };
  });
  const unmapped = data.graph?.plannedPullRequests.filter((pr) => !pr.repositoryId || !pr.githubPrNumber).length ?? 0;
  const openRisks = risks.filter((risk) => risk.state === "open");
  const blockedMilestones = data.milestones.filter((milestone) => milestone.status === "blocked").length;
  const nextActions: string[] = [];
  if (!data.graph) nextActions.push("Register an approved development plan.");
  if (unmapped > 0) nextActions.push(`Map ${unmapped} approved roadmap PR${unmapped === 1 ? "" : "s"} to GitHub.`);
  if ((data.progress?.remaining ?? 0) > 0) nextActions.push(`Complete ${data.progress!.remaining} remaining approved roadmap PRs.`);
  if (blockedMilestones > 0) nextActions.push(`Resolve ${blockedMilestones} blocked milestone${blockedMilestones === 1 ? "" : "s"}.`);
  for (const risk of openRisks.filter((risk) => risk.blocking)) nextActions.push(`Resolve blocker: ${risk.title}`);
  if (!target) nextActions.push("Select a release commit and environment.");
  for (const check of gates.filter((check) => check.status !== "passed")) nextActions.push(`${check.status === "failed" ? "Repair and reassess" : "Collect current evidence for"} ${check.gate}.`);
  const blocked = !data.graph || !data.progress || data.progress.remaining > 0 || unmapped > 0 || blockedMilestones > 0 || openRisks.some((risk) => risk.blocking) || gates.some((gate) => gate.status === "failed");
  return { status: blocked ? "blocked" : target && gates.every((gate) => gate.status === "passed") ? "ready" : "not-assessed", risks: openRisks,
    target, gates, nextActions, evaluatedAt: now.toISOString() };
}

export function validateReleaseEvidence(evidence: ReleaseEvidence) {
  const observed = new Date(evidence.observedAt).getTime(), expires = new Date(evidence.expiresAt).getTime();
  if (!/^[a-f0-9]{40}$/.test(evidence.commitSha) || !/^[a-z0-9-]{1,64}$/.test(evidence.environment)) throw new Error("Release evidence requires an immutable commit SHA and valid environment.");
  if (!releaseGates.includes(evidence.gate) || !["passed", "failed"].includes(evidence.status)) throw new Error("Unsupported release gate or evidence status.");
  if (!Number.isFinite(observed) || !Number.isFinite(expires) || expires <= observed || observed > Date.now()) throw new Error("Release evidence timestamps must be valid, current, and ordered.");
  let url: URL;
  try { url = new URL(evidence.evidenceUrl); } catch { throw new Error("Evidence must have a source URL."); }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Evidence source must use HTTPS without embedded credentials.");
}
