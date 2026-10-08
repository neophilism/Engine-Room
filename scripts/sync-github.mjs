import { Pool } from "pg";

const owner = process.env.ENGINE_ROOM_GITHUB_OWNER || "neophilism";
const apiBase = process.env.GITHUB_API_BASE_URL || "https://api.github.com";
const token = process.env.GITHUB_READ_TOKEN;
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
if (!/^[a-z\d-]+$/i.test(owner)) throw new Error("Invalid GitHub owner");
const pool = new Pool({ connectionString: url, max: 2 });
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "engine-room-public-repository-sync",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
};
async function getPage(path) {
  const response = await fetch(`${apiBase}${path}`, { headers, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`GitHub API request failed (${response.status}) for ${path.split("?")[0]}`);
  return response.json();
}
async function paginate(path) {
  const result = [];
  for (let page = 1; page <= 30; page++) {
    const separator = path.includes("?") ? "&" : "?";
    const values = await getPage(`${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(values)) throw new Error("Expected GitHub collection");
    result.push(...values);
    if (values.length < 100) return result;
  }
  throw new Error("GitHub pagination limit exceeded");
}
const excluded = new Set((process.env.ENGINE_ROOM_EXCLUDE_REPOSITORIES || "datasciencecoursera,opencv,pupil,facerec").split(",").map(x => x.trim().toLowerCase()));
const all = await paginate(`/users/${encodeURIComponent(owner)}/repos?type=owner&sort=updated`);
const repositories = all.filter(repo => !repo.private && !repo.archived && !repo.fork && !excluded.has(repo.name.toLowerCase()));
let projectsUpdated = 0, prsUpdated = 0;
try {
  for (const repo of repositories) {
    const fullName = repo.full_name;
    const pullRequests = await paginate(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}/pulls?state=all`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const upsert = await client.query(
        `INSERT INTO repositories(id, github_repository_id, owner_login, name, full_name, html_url, default_branch, visibility, archived, updated_at)
         VALUES(gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'public', false, now())
         ON CONFLICT (github_repository_id) DO UPDATE SET owner_login = EXCLUDED.owner_login,
          name = EXCLUDED.name, full_name = EXCLUDED.full_name, html_url = EXCLUDED.html_url,
          default_branch = EXCLUDED.default_branch, visibility = EXCLUDED.visibility,
          archived = EXCLUDED.archived, updated_at = now() RETURNING id`,
        [repo.id, owner, repo.name, fullName, repo.html_url, repo.default_branch]
      );
      const repositoryId = upsert.rows[0].id;
      const slug = repo.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const project = await client.query(
        `INSERT INTO projects(id, slug, display_name, summary, status)
         VALUES(gen_random_uuid(), $1, $2, $3, 'active-development')
         ON CONFLICT(slug) DO UPDATE SET summary = COALESCE(projects.summary, EXCLUDED.summary),
           updated_at = now() RETURNING id`,
        [slug, repo.name.replace(/[-_]/g, " "), repo.description || null]
      );
      const projectId = project.rows[0].id;
      await client.query(
        `INSERT INTO project_repositories(project_id, repository_id, relationship)
         VALUES($1, $2, 'primary') ON CONFLICT(project_id, repository_id) DO NOTHING`,
        [projectId, repositoryId]
      );
      for (const pr of pullRequests) {
        // GitHub's list-pulls response includes merged_at; a closed PR is not necessarily merged.
        await client.query(
          `INSERT INTO github_pull_requests(
            github_pull_request_id, repository_id, number, title, state, draft, html_url,
            author_login, created_at, updated_at, closed_at, merged_at, last_synced_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
           ON CONFLICT(github_pull_request_id) DO UPDATE SET repository_id = EXCLUDED.repository_id,
             number = EXCLUDED.number, title = EXCLUDED.title, state = EXCLUDED.state,
             draft = EXCLUDED.draft, html_url = EXCLUDED.html_url, author_login = EXCLUDED.author_login,
             updated_at = EXCLUDED.updated_at, closed_at = EXCLUDED.closed_at,
             merged_at = EXCLUDED.merged_at, last_synced_at = now()`,
          [pr.id, repositoryId, pr.number, pr.title, pr.state, !!pr.draft, pr.html_url,
           pr.user?.login || null, pr.created_at, pr.updated_at, pr.closed_at, pr.merged_at]
        );
      }
      await client.query("COMMIT");
      projectsUpdated++;
      prsUpdated += pullRequests.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
  console.info(JSON.stringify({ syncedRepositories: projectsUpdated, syncedPullRequests: prsUpdated,
    note: "GitHub activity imported; roadmap progress remains unmeasured without approved plan mappings." }));
} finally { await pool.end(); }
