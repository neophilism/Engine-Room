// @vitest-environment node
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabasePool, closeDatabasePool } from "../../lib/server/database";
import { registerApprovedProject } from "../../lib/server/project-registration";
import { loadPortfolioOverview } from "../../lib/server/portfolio-overview";
import { loadProjectDashboard } from "../../lib/server/project-dashboard";
import { registerProjectFeatures } from "../../lib/server/project-features";
import { persistDevelopmentActivity } from "../../lib/server/development-activity";
import { registerProjectRisk, setProjectReleaseTarget, recordProjectReleaseEvidence } from "../../lib/server/project-readiness";
import { recordOperationSamples, loadOperationsOverview } from "../../lib/server/operations";
import { createRelease, transitionRelease, loadReleasesOverview } from "../../lib/server/releases";
import { recordIncident, transitionIncident, loadIncidentsOverview } from "../../lib/server/incidents";
import { ingestTelemetry, loadTelemetryFeeds } from "../../lib/server/telemetry";
import { normalizeTelemetry } from "../../lib/telemetry/adapters";
import type { TelemetryCredential } from "../../lib/telemetry/types";
import { recordFinancialData, loadFinanceOverview } from "../../lib/server/finance";

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
  it("combines PR activity with idempotent commit/issue/review/workflow records", async () => {
    const pool = getDatabasePool(source);
    const activity = { repositoryFullName: "test/core", kind: "workflow" as const, externalId: "run-1", title: "CI", url: "https://github.com/test/core/actions/runs/1", occurredAt: "2026-10-08T00:00:00Z", state: "completed", conclusion: "success" };
    const client = await pool.connect();
    try { await persistDevelopmentActivity(client, [activity]); await persistDevelopmentActivity(client, [activity]); } finally { client.release(); }
    const data = await loadProjectDashboard("database-fixture", source);
    expect(data.activities?.filter((record) => record.kind === "workflow")).toHaveLength(1);
    expect(data.activities?.filter((record) => record.kind === "pull-request")).toHaveLength(3);
    expect(data.progress?.completed).toBe(1);
  });
  it("persists risks and target-scoped release evidence without declaring incomplete work ready", async () => {
    const data = await loadProjectDashboard("database-fixture", source), projectId = data.project!.id;
    const target = { commitSha: "a".repeat(40), environment: "production" };
    await setProjectReleaseTarget(projectId, target);
    await registerProjectRisk(projectId, { key: "launch-risk", title: "Open launch blocker", severity: "high", blocking: true, state: "open" });
    await recordProjectReleaseEvidence(projectId, { ...target, gate: "tests", status: "passed", evidenceUrl: "https://example.org/test-evidence", observedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() });
    const updated = await loadProjectDashboard("database-fixture", source);
    expect(updated.readiness?.status).toBe("blocked");
    expect(updated.readiness?.gates.find((gate) => gate.gate === "tests")?.status).toBe("passed");
    expect(updated.readiness?.gates.find((gate) => gate.gate === "deployment")?.status).toBe("unknown");
    expect(updated.readiness?.risks[0].title).toBe("Open launch blocker");
  });
  it("persists measured operational samples idempotently with environment isolation", async () => {
    const data = await loadProjectDashboard("database-fixture", source);
    const sample = { projectId: data.project!.id, environment: "production", metric: "cpu-percent" as const, value: 10, source: "fixture-monitor", externalId: "cpu-1", observedAt: new Date().toISOString() };
    await recordOperationSamples([sample]); await recordOperationSamples([{ ...sample, value: 20 }]);
    const overview = await loadOperationsOverview(source);
    expect(overview.source).toBe("database");
    expect(overview.samples).toHaveLength(1);
    expect(overview.samples[0]).toMatchObject({ value: 20, environment: "production" });
  });
  it("applies release transitions atomically and handles identical replay without advancing twice", async () => {
    const data = await loadProjectDashboard("database-fixture", source);
    const target = { commitSha: "a".repeat(40), environment: "production" };
    const id = await createRelease(data.project!.id, "v1", target);
    expect(await createRelease(data.project!.id, "v1", target)).toBe(id);
    const event = { key: "start", from: "draft" as const, to: "building" as const, actor: "fixture-ci", occurredAt: new Date().toISOString() };
    expect((await transitionRelease(id, event)).applied).toBe(true);
    expect((await transitionRelease(id, event)).applied).toBe(false);
    await expect(transitionRelease(id, { ...event, key: "bad", from: "approved", to: "deploying" })).rejects.toThrow("precondition");
    expect((await loadReleasesOverview(source)).releases[0].state).toBe("building");
  });
  it("records incident responses with replay protection and rejects stale or conflicting events", async () => {
    const data = await loadProjectDashboard("database-fixture", source);
    const signal = { projectId: data.project!.id, environment: "production", source: "fixture-monitor", externalId: "outage-1", title: "API unavailable", severity: "critical" as const, occurredAt: new Date(Date.now() - 2000).toISOString() };
    const id = await recordIncident(signal);
    expect(await recordIncident(signal)).toBe(id);
    const event = { key: "ack", from: "detected" as const, to: "acknowledged" as const, actor: "on-call", note: "Investigating API failures", occurredAt: new Date(Date.now() - 1000).toISOString() };
    expect((await transitionIncident(id, event)).applied).toBe(true);
    expect((await transitionIncident(id, event)).applied).toBe(false);
    await expect(transitionIncident(id, { ...event, note: "Changed content" })).rejects.toThrow("different content");
    await expect(transitionIncident(id, { ...event, key: "stale", from: "acknowledged", to: "mitigated", occurredAt: signal.occurredAt })).rejects.toThrow("time order");
    expect((await loadIncidentsOverview(source)).incidents[0]).toMatchObject({ state: "acknowledged", lastNote: event.note, resolvedAt: null });
    await transitionIncident(id, { ...event, key: "contain", from: "acknowledged", to: "mitigated", note: "Provider recovered", occurredAt: new Date().toISOString() });
    await transitionIncident(id, { ...event, key: "recover", from: "mitigated", to: "resolved", note: "Recovery verified", occurredAt: new Date().toISOString() });
    expect((await loadIncidentsOverview(source)).incidents[0].resolvedAt).not.toBeNull();
  });
  it("ingests batches atomically, deduplicates receipts, and keeps source targets isolated", async () => {
    const data = await loadProjectDashboard("database-fixture", source), pool = getDatabasePool(source);
    const credential: TelemetryCredential = { id: "integration-monitor", secret: "test-secret-with-at-least-32-bytes", projectId: data.project!.id, environment: "staging", source: "batch-monitor", adapter: "engine-room-v1", capabilities: ["metric", "incident", "incident-event", "release", "release-event"], evidenceTransitions: [] };
    const encode = (deliveryId: string, records: unknown[]) => normalizeTelemetry(Buffer.from(JSON.stringify({ version: 1, deliveryId, records })), credential);
    const at = new Date().toISOString(), metric = { kind: "metric", externalId: "cpu-batch", metric: "cpu-percent", value: 30, observedAt: at };
    const batch = encode("batch-1", [metric, { kind: "incident", externalId: "batch-alert", title: "Staging errors", severity: "high", occurredAt: at }, { kind: "release", key: "v1", commitSha: "b".repeat(40) }]);
    expect(await ingestTelemetry(credential, batch, "1".repeat(64))).toBe("accepted");
    expect(await ingestTelemetry(credential, batch, "1".repeat(64))).toBe("duplicate");
    await expect(ingestTelemetry(credential, batch, "2".repeat(64))).rejects.toMatchObject({ status: 409 });
    const conflict = encode("batch-rollback", [{ ...metric, externalId: "must-rollback" }, { kind: "incident-event", externalId: "outage-1", event: { key: "wrong-source", from: "detected", to: "acknowledged", occurredAt: at, note: "Wrong scope" } }]);
    await expect(ingestTelemetry(credential, conflict, "3".repeat(64))).rejects.toMatchObject({ status: 409 });
    expect((await pool.query("select 1 from project_operation_samples where external_id='must-rollback'")).rows).toHaveLength(0);
    expect((await pool.query("select 1 from telemetry_deliveries where delivery_id='batch-rollback'")).rows).toHaveLength(0);
    expect((await loadTelemetryFeeds(source)).feeds).toHaveLength(1);
    expect((await loadReleasesOverview(source)).releases).toHaveLength(2);
    const ack = encode("batch-response", [{ kind: "incident-event", externalId: "batch-alert", event: { key: "ack", from: "detected", to: "acknowledged", occurredAt: at, note: "Staging owner responding" } }]);
    expect(await ingestTelemetry(credential, ack, "4".repeat(64))).toBe("accepted");
    expect((await loadIncidentsOverview(source)).incidents.find((incident) => incident.externalId === "batch-alert")?.state).toBe("acknowledged");
  });
  it("persists immutable financial actuals and separate forecast snapshots without duplicate imports", async () => {
    const data = await loadProjectDashboard("database-fixture", source);
    const entry = { projectId: data.project!.id, environment: "production", source: "fixture-billing", externalId: "invoice-1", kind: "cost" as const, category: "hosting", currency: "USD" as const, amountMinor: 1234, occurredOn: "2026-10-01" };
    const forecast = { projectId: entry.projectId, environment: entry.environment, source: entry.source, externalId: "forecast-1", currency: entry.currency, period: "2026-10", costMinor: 2000, revenueMinor: 5000, observedAt: new Date().toISOString() };
    await recordFinancialData([entry], [forecast]); await recordFinancialData([entry], [forecast]);
    const overview = await loadFinanceOverview(source);
    expect(overview.source).toBe("database"); expect(overview.entries).toHaveLength(1); expect(overview.forecasts).toHaveLength(1);
    expect(overview.entries[0]).toMatchObject({ amountMinor: 1234, occurredOn: "2026-10-01" });
    await expect(recordFinancialData([{ ...entry, amountMinor: 999 }])).rejects.toThrow("different content");
    expect((await loadFinanceOverview(source)).entries[0].amountMinor).toBe(1234);
  });
});
