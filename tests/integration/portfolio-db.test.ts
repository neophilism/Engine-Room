// @vitest-environment node
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabasePool, closeDatabasePool } from "../../lib/server/database";
import { registerApprovedProject } from "../../lib/server/project-registration";
import { loadPortfolioOverview } from "../../lib/server/portfolio-overview";
import { loadProjectDashboard } from "../../lib/server/project-dashboard";
import { registerProjectFeatures } from "../../lib/server/project-features";

const url = process.env.ENGINE_ROOM_TEST_DATABASE_URL;
const source = { NODE_ENV: "test", DATABASE_URL: url };
describe.skipIf(!url)("PostgreSQL portfolio queries", () => {
  beforeAll(async () => {
    const pool = getDatabasePool(source);
    for (const name of (await readdir("db/migrations")).filter((name) => name.endsWith(".sql")).sort()) await pool.query(await readFile(`db/migrations/${name}`, "utf8"));
    process.env.DATABASE_URL = url;
    await registerApprovedProject({ project: { name: "Database Fixture", displayName: "Database Fixture", repository: "test/core", status: "active-development" },
      roadmap: { version: 1, plannedPrs: 4, approved: true }, milestones: [{ name: "Foundation", prs: 4 }] },
    { githubRepositoryId: 99, ownerLogin: "test", name: "core", fullName: "test/core", htmlUrl: "https://github.com/test/core", defaultBranch: "main", visibility: "public", archived: false }, { sourceRef: "fixture" });
    const repository = (await pool.query<{ id: string }>("select id from repositories where full_name = 'test/core'")).rows[0].id;
    await pool.query("update planned_pull_requests set github_pr_number = ordinal");
    for (const number of [1, 2, 3]) await pool.query(`insert into github_pull_requests (github_pull_request_id, repository_id, number, title, state, draft, html_url, created_at, updated_at, merged_at)
      values ($1, $2, $7, $3, $4, false, $5, now(), now(), $6)`, [number, repository, `PR ${number}`, number === 2 ? "open" : "closed", `https://github.com/test/core/pull/${number}`, number === 1 ? new Date() : null, number]);
    await pool.query(`insert into repositories (id, github_repository_id, owner_login, name, full_name, html_url, visibility) values ($1, 100, 'test', 'other', 'test/other', 'https://github.com/test/other', 'public')`, [randomUUID()]);
    const other = (await pool.query<{ id: string }>("select id from repositories where full_name = 'test/other'")).rows[0].id;
    await pool.query(`insert into github_pull_requests (github_pull_request_id, repository_id, number, title, state, draft, html_url, created_at, updated_at, merged_at)
      values (1001, $1, 4, 'Other repo merge', 'closed', false, 'https://github.com/test/other/pull/4', now(), now(), now())`, [other]);
  }, 30_000);
  afterAll(async () => { delete process.env.DATABASE_URL; await closeDatabasePool(); });
  it("counts real mapped merges and open work while ignoring unmerged, missing, and other-repository PRs", async () => {
    const overview = await loadPortfolioOverview(source);
    expect(overview.source).toBe("database");
    expect(overview.projects[0]).toMatchObject({ planned: 4, completed: 1, inProgress: 1, percent: 25, slug: "database-fixture" });
    expect(overview.projects[0].repositories[0]).toMatchObject({ planned: 4, completed: 1, inProgress: 1 });
  });
  it("loads a consistent dashboard, derives milestones, and distinguishes unknown project slugs", async () => {
    const data = await loadProjectDashboard("database-fixture", source);
    expect(data.source).toBe("database");
    expect(data.progress).toMatchObject({ planned: 4, completed: 1, remaining: 3, percent: 25 });
    expect(data.graph?.plannedPullRequests.map((pr) => pr.status)).toEqual(["merged", "in-progress", "planned", "planned"]);
    expect(data.milestones[0]).toMatchObject({ status: "active", completed: 1 });
    expect((await loadProjectDashboard("missing-project", source)).project).toBeNull();
  });
  it("registers and updates plan-scoped features without duplicates or cross-plan work", async () => {
    const data = await loadProjectDashboard("database-fixture", source);
    const planId = data.graph!.plan.id;
    const definitions = [{ key: "done", title: "Delivered capability", plannedPrOrdinals: [1] },
      { key: "active", title: "Active capability", plannedPrOrdinals: [1, 2] }, { key: "unlinked", title: "Unlinked capability", plannedPrOrdinals: [] }];
    await registerProjectFeatures(planId, definitions);
    await registerProjectFeatures(planId, definitions);
    const updated = await loadProjectDashboard("database-fixture", source);
    expect(updated.features?.map((feature) => feature.status)).toEqual(["implemented", "underway", "remaining"]);
    expect(updated.features).toHaveLength(3);
    expect((await loadPortfolioOverview(source)).projects[0].features).toHaveLength(3);
    await expect(registerProjectFeatures(planId, [{ key: "bad", title: "Wrong plan ordinal", plannedPrOrdinals: [999] }])).rejects.toThrow("outside this approved plan");
  });
});
