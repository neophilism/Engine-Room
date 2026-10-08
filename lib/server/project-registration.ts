import type { PoolClient } from "pg";
import {
  projectStatuses,
  type ProjectStatus
} from "../domain/portfolio";
import type { DiscoveredRepository } from "../github/types";
import type { ProjectManifest } from "../manifest/project-manifest";
import { getDatabasePool } from "./database";
import {
  persistApprovedDevelopmentPlanWithClient,
  type PersistApprovedPlanResult
} from "./development-plans";

export type PlannedPrSeed = {
  ordinal: number;
  milestoneOrdinal: number;
  title: string;
};

export type PreparedProjectRegistration = {
  slug: string;
  status: ProjectStatus;
  plannedPullRequests: PlannedPrSeed[];
};

function asProjectStatus(value: string): ProjectStatus {
  if (!projectStatuses.includes(value as ProjectStatus)) {
    throw new Error(`Unsupported project status: ${value}`);
  }
  return value as ProjectStatus;
}

export function projectSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) throw new Error("Project name cannot produce an empty slug.");
  return slug;
}

export function prepareProjectRegistration(
  manifest: ProjectManifest,
  repository: DiscoveredRepository
): PreparedProjectRegistration {
  if (!manifest.roadmap.approved) {
    throw new Error("Only approved manifests can register projects.");
  }

  if (repository.fullName !== manifest.project.repository) {
    throw new Error(
      `Manifest repository ${manifest.project.repository} does not match discovered repository ${repository.fullName}.`
    );
  }

  const plannedPullRequests: PlannedPrSeed[] = [];
  let ordinal = 1;

  for (const [milestoneIndex, milestone] of manifest.milestones.entries()) {
    for (let index = 0; index < milestone.prs; index += 1) {
      plannedPullRequests.push({
        ordinal,
        milestoneOrdinal: milestoneIndex + 1,
        title: `Roadmap PR ${ordinal}`
      });
      ordinal += 1;
    }
  }

  if (plannedPullRequests.length !== manifest.roadmap.plannedPrs) {
    throw new Error("Registration seed does not match the approved planned PR total.");
  }

  return {
    slug: projectSlug(manifest.project.name),
    status: asProjectStatus(manifest.project.status),
    plannedPullRequests
  };
}

async function upsertRepository(
  client: PoolClient,
  repository: DiscoveredRepository
) {
  const result = await client.query<{ id: string }>(
    `insert into repositories (
       id, github_repository_id, owner_login, name, full_name, html_url,
       default_branch, visibility, archived, updated_at
     )
     values (
       gen_random_uuid(), $1, $2, $3, $4, $5, $6,
       $7::repository_visibility, $8, now()
     )
     on conflict (github_repository_id) do update set
       owner_login = excluded.owner_login,
       name = excluded.name,
       full_name = excluded.full_name,
       html_url = excluded.html_url,
       default_branch = excluded.default_branch,
       visibility = excluded.visibility,
       archived = excluded.archived,
       updated_at = now()
     returning id`,
    [
      repository.githubRepositoryId,
      repository.ownerLogin,
      repository.name,
      repository.fullName,
      repository.htmlUrl,
      repository.defaultBranch,
      repository.visibility,
      repository.archived
    ]
  );

  const repositoryId = result.rows[0]?.id;
  if (!repositoryId) throw new Error("Failed to register repository.");
  return repositoryId;
}

async function upsertProject(
  client: PoolClient,
  manifest: ProjectManifest,
  prepared: PreparedProjectRegistration
) {
  const result = await client.query<{ id: string }>(
    `insert into projects (
       id, slug, display_name, status, updated_at
     )
     values (gen_random_uuid(), $1, $2, $3::project_status, now())
     on conflict (slug) do update set
       display_name = excluded.display_name,
       status = excluded.status,
       updated_at = now()
     returning id`,
    [prepared.slug, manifest.project.displayName, prepared.status]
  );

  const projectId = result.rows[0]?.id;
  if (!projectId) throw new Error("Failed to register project.");
  return projectId;
}

async function setPrimaryRepository(
  client: PoolClient,
  projectId: string,
  repositoryId: string
) {
  await client.query(
    `update project_repositories
     set relationship = 'supporting'
     where project_id = $1
       and repository_id <> $2
       and relationship = 'primary'`,
    [projectId, repositoryId]
  );

  await client.query(
    `insert into project_repositories (
       project_id, repository_id, relationship
     )
     values ($1, $2, 'primary')
     on conflict (project_id, repository_id) do update set
       relationship = 'primary'`,
    [projectId, repositoryId]
  );
}

async function seedPlannedPullRequests(
  client: PoolClient,
  planId: string,
  repositoryId: string,
  seeds: readonly PlannedPrSeed[]
) {
  const milestones = await client.query<{ id: string; ordinal: number }>(
    `select id, ordinal
     from milestones
     where development_plan_id = $1
     order by ordinal`,
    [planId]
  );
  const milestoneIds = new Map(
    milestones.rows.map((milestone) => [milestone.ordinal, milestone.id])
  );

  for (const seed of seeds) {
    const milestoneId = milestoneIds.get(seed.milestoneOrdinal);
    if (!milestoneId) {
      throw new Error(
        `Missing milestone ordinal ${seed.milestoneOrdinal} while seeding roadmap PRs.`
      );
    }

    await client.query(
      `insert into planned_pull_requests (
         id, development_plan_id, milestone_id, repository_id,
         ordinal, title, description, status
       )
       values (
         gen_random_uuid(), $1, $2, $3, $4, $5,
         'Imported roadmap unit; GitHub mapping intentionally pending.',
         'planned'
       )`,
      [
        planId,
        milestoneId,
        repositoryId,
        seed.ordinal,
        seed.title
      ]
    );
  }
}

export async function registerApprovedProject(
  manifest: ProjectManifest,
  repository: DiscoveredRepository,
  {
    sourceRef,
    approvedAt
  }: {
    sourceRef: string;
    approvedAt?: Date;
  }
): Promise<{
  projectId: string;
  repositoryId: string;
  plan: PersistApprovedPlanResult;
}> {
  const prepared = prepareProjectRegistration(manifest, repository);
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const repositoryId = await upsertRepository(client, repository);
    const projectId = await upsertProject(client, manifest, prepared);
    await setPrimaryRepository(client, projectId, repositoryId);

    const plan = await persistApprovedDevelopmentPlanWithClient(
      client,
      projectId,
      manifest,
      { sourceRef, approvedAt }
    );

    if (plan.created) {
      await seedPlannedPullRequests(
        client,
        plan.planId,
        repositoryId,
        prepared.plannedPullRequests
      );
    }

    await client.query("commit");
    return { projectId, repositoryId, plan };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
