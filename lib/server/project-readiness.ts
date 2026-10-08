import type { PoolClient } from "pg";
import { calculateProjectReadiness, validateReleaseEvidence, type ProjectRisk, type ReleaseTarget, type ReleaseEvidence, type ReleaseGate } from "../domain/project-readiness";
import type { ProjectDashboardData } from "../domain/project-dashboard";
import { getDatabasePool } from "./database";

export async function loadProjectReadiness(client: Pick<PoolClient, "query">, projectId: string, data: ProjectDashboardData) {
  const risks = await client.query<{ risk_key: string; title: string; severity: ProjectRisk["severity"]; blocking: boolean; state: ProjectRisk["state"] }>("select * from project_risks where project_id = $1", [projectId]);
  const targets = await client.query<{ commit_sha: string; environment: string }>("select * from project_release_targets where project_id = $1", [projectId]);
  const evidence = await client.query<{ commit_sha: string; environment: string; gate: ReleaseGate; status: ReleaseEvidence["status"]; evidence_url: string; observed_at: Date; expires_at: Date }>(
    `select e.* from project_release_evidence e join project_release_targets t on t.project_id = e.project_id and t.commit_sha = e.commit_sha and t.environment = e.environment
     where e.project_id = $1 order by e.observed_at desc`, [projectId]);
  const target = targets.rows[0];
  return calculateProjectReadiness(data, risks.rows.map((risk) => ({ key: risk.risk_key, title: risk.title, severity: risk.severity, blocking: risk.blocking, state: risk.state })),
    target ? { commitSha: target.commit_sha, environment: target.environment } : undefined,
    evidence.rows.map((item) => ({ commitSha: item.commit_sha, environment: item.environment, gate: item.gate, status: item.status,
      evidenceUrl: item.evidence_url, observedAt: item.observed_at.toISOString(), expiresAt: item.expires_at.toISOString() })));
}

export async function registerProjectRisk(projectId: string, risk: ProjectRisk) {
  if (!/^[a-z0-9-]{1,64}$/.test(risk.key) || !risk.title.trim() || risk.title.length > 1000 || !["low", "medium", "high", "critical"].includes(risk.severity) || !["open", "resolved"].includes(risk.state)) throw new Error("Invalid project risk.");
  await getDatabasePool().query(`insert into project_risks (project_id, risk_key, title, severity, blocking, state) values ($1, $2, $3, $4, $5, $6)
    on conflict (project_id, risk_key) do update set title = excluded.title, severity = excluded.severity, blocking = excluded.blocking, state = excluded.state, updated_at = now()`,
  [projectId, risk.key, risk.title.trim(), risk.severity, risk.blocking, risk.state]);
}

export async function setProjectReleaseTarget(projectId: string, target: ReleaseTarget) {
  if (!/^[a-f0-9]{40}$/.test(target.commitSha) || !/^[a-z0-9-]{1,64}$/.test(target.environment)) throw new Error("Release target requires an immutable commit SHA and environment.");
  await getDatabasePool().query(`insert into project_release_targets (project_id, commit_sha, environment) values ($1, $2, $3)
    on conflict (project_id) do update set commit_sha = excluded.commit_sha, environment = excluded.environment, updated_at = now()`, [projectId, target.commitSha, target.environment]);
}

export async function recordProjectReleaseEvidence(projectId: string, evidence: ReleaseEvidence) {
  validateReleaseEvidence(evidence);
  await getDatabasePool().query(`insert into project_release_evidence (project_id, commit_sha, environment, gate, status, evidence_url, observed_at, expires_at)
    values ($1, $2, $3, $4, $5, $6, $7, $8)`, [projectId, evidence.commitSha, evidence.environment, evidence.gate, evidence.status, evidence.evidenceUrl, evidence.observedAt, evidence.expiresAt]);
}
