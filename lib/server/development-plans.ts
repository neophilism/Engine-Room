import type { PoolClient } from "pg";
import { nextApprovedPlanVersion } from "../domain/development-plan-version";
import type { ProjectManifest } from "../manifest/project-manifest";
import { getDatabasePool } from "./database";

type ExistingVersionRow = {
  version: number;
  source_fingerprint: string;
  approved_at: Date;
};

export type PersistApprovedPlanResult =
  | {
      version: number;
      fingerprint: string;
      unchanged: true;
      created: false;
    }
  | {
      version: number;
      fingerprint: string;
      unchanged: false;
      created: true;
      planId: string;
    };

async function loadApprovedVersions(client: PoolClient, projectId: string) {
  const result = await client.query<ExistingVersionRow>(
    `select version, source_fingerprint, approved_at
     from development_plans
     where project_id = $1 and status in ('approved', 'superseded')
     order by version`,
    [projectId]
  );

  return result.rows.map((row) => ({
    version: row.version,
    fingerprint: row.source_fingerprint,
    approvedAt: row.approved_at.toISOString()
  }));
}

export async function persistApprovedDevelopmentPlanWithClient(
  client: PoolClient,
  projectId: string,
  manifest: ProjectManifest,
  {
    sourceRef,
    approvedAt = new Date()
  }: {
    sourceRef: string;
    approvedAt?: Date;
  }
): Promise<PersistApprovedPlanResult> {
  const existing = await loadApprovedVersions(client, projectId);
  const decision = nextApprovedPlanVersion(existing, manifest);

  if (decision.unchanged) {
    return {
      version: decision.version,
      fingerprint: decision.fingerprint,
      unchanged: true,
      created: false
    };
  }

  await client.query(
    `update development_plans
     set status = 'superseded'
     where project_id = $1 and status = 'approved'`,
    [projectId]
  );

  const planResult = await client.query<{ id: string }>(
    `insert into development_plans (
       id, project_id, version, status, title, summary, planned_pr_total,
       approved_at, source_repository, source_ref, source_fingerprint,
       manifest_snapshot
     )
     values (
       gen_random_uuid(), $1, $2, 'approved', $3, $4, $5,
       $6, $7, $8, $9, $10::jsonb
     )
     returning id`,
    [
      projectId,
      decision.version,
      `${manifest.project.displayName} development plan`,
      `Approved roadmap version ${manifest.roadmap.version}`,
      manifest.roadmap.plannedPrs,
      approvedAt,
      manifest.project.repository,
      sourceRef,
      decision.fingerprint,
      JSON.stringify(manifest)
    ]
  );

  const planId = planResult.rows[0]?.id;
  if (!planId) throw new Error("Failed to create approved development plan.");

  for (const [index, milestone] of manifest.milestones.entries()) {
    await client.query(
      `insert into milestones (
         id, development_plan_id, ordinal, name, planned_pr_total, status
       )
       values (gen_random_uuid(), $1, $2, $3, $4, 'planned')`,
      [planId, index + 1, milestone.name, milestone.prs]
    );
  }

  return {
    version: decision.version,
    fingerprint: decision.fingerprint,
    unchanged: false,
    created: true,
    planId
  };
}

export async function persistApprovedDevelopmentPlan(
  projectId: string,
  manifest: ProjectManifest,
  options: {
    sourceRef: string;
    approvedAt?: Date;
  }
): Promise<PersistApprovedPlanResult> {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await persistApprovedDevelopmentPlanWithClient(
      client,
      projectId,
      manifest,
      options
    );
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
