import type { DiscoveredRepository } from "../github/types";
import type { ProjectManifest } from "../manifest/project-manifest";
import { projectSlug, registerApprovedProject } from "./project-registration";
import { getDatabasePool } from "./database";

/** Register repositories without a manifest as visible, unscored projects. */
export async function registerDiscoveredRepository(repository: DiscoveredRepository) {
  const pool = getDatabasePool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query<{ id: string }>(
      "select p.id from projects p join project_repositories pr on pr.project_id=p.id join repositories r on r.id=pr.repository_id where r.github_repository_id=$1 limit 1",
      [repository.githubRepositoryId]
    );
    if (existing.rows[0]) { await client.query("commit"); return { created: false }; }
    const slug = projectSlug(repository.fullName.replace("/", "-"));
    const row = await client.query<{ id: string }>(
      "insert into projects (id,slug,display_name,status,updated_at) values (gen_random_uuid(),$1,$2,'planned',now()) on conflict (slug) do nothing returning id",
      [slug, repository.name.replace(/[-_]/g, " ")]
    );
    if (!row.rows[0]) { await client.query("commit"); return { created: false }; }
    const repo = await client.query<{ id: string }>("select id from repositories where github_repository_id=$1",[repository.githubRepositoryId]);
    if (!repo.rows[0]) throw new Error("Repository must be synchronized before discovery registration.");
    await client.query("insert into project_repositories (project_id,repository_id,relationship) values ($1,$2,'primary') on conflict do nothing",
      [row.rows[0].id, repo.rows[0].id]);
    await client.query("commit");
    return { created: true };
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function applyDiscoveredManifests(
  repositories: readonly DiscoveredRepository[],
  approved: readonly { repository: DiscoveredRepository; manifest: ProjectManifest }[]
) {
  const approvedIds = new Set(approved.map((item) => item.repository.githubRepositoryId));
  let approvedCount = 0;
  for (const item of approved) {
    await registerApprovedProject(item.manifest, item.repository, { sourceRef: `${item.repository.fullName}/.exechub/project.yml@${item.repository.defaultBranch}` });
    approvedCount++;
  }
  let discovered = 0;
  for (const repository of repositories) {
    if (approvedIds.has(repository.githubRepositoryId)) continue;
    const result = await registerDiscoveredRepository(repository);
    if (result.created) discovered++;
  }
  return { approved: approvedCount, discovered };
}
