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
import { recordAccessObservations, loadAccessOverview } from "../../lib/server/access";
import {recordGitHubWebhookDelivery} from '../../lib/server/github-webhooks';
import {persistPullRequest,persistChecks,processWebhookInbox} from '../../lib/sync/github-runtime.mjs';
import {persistPlanDocument} from '../../lib/sync/plan-import.mjs';
import {reconcilePortfolio} from '../../lib/sync/reconcile.mjs';
import {loadProjectMonitorData} from '../../lib/server/live-monitor';
import {loadDatabaseReadout} from '../../lib/server/database-readout';

const url = process.env.ENGINE_ROOM_TEST_DATABASE_URL;
const source = { NODE_ENV: "test", DATABASE_URL: url };
describe.skipIf(!url)("PostgreSQL portfolio queries", () => {
  beforeAll(async () => {
    const pool = getDatabasePool(source);
    // Browser tests reuse this PostgreSQL service after integration tests. Record
    // migrations when applying them so the production runner doesn't attempt
    // to create the existing enum/table definitions a second time.
    for (const name of (await readdir("db/migrations")).filter((name) => name.endsWith(".sql")).sort()) {
      await pool.query(await readFile(`db/migrations/${name}`, "utf8"));
      await pool.query(
        "insert into engine_room_schema_migrations(version, description) values($1, $2) on conflict(version) do nothing",
        [name.split("_")[0], name]
      );
    }
    process.env.DATABASE_URL = url;
    await registerApprovedProject({ project: { name: "Database Fixture", displayName: "Database Fixture", repository: "test/core", status: "active-development" },
      roadmap: { version: 1, plannedPrs: 4, approved: true }, milestones: [{ name: "Foundation", prs: 4 }] },
    { githubRepositoryId: 99, ownerLogin: "test", name: "core", fullName: "test/core", htmlUrl: "https://github.com/test/core", defaultBranch: "main", visibility: "public", archived: false }, { sourceRef: "fixture" });
    const repository = (await pool.query<{ id: string }>("select id from repositories where full_name = 'test/core'")).rows[0].id;
    await pool.query("update planned_pull_requests set github_pr_number = ordinal");
    for (const number of [1, 2, 3]) await pool.query(`insert into github_pull_requests (github_pull_request_id, repository_id, number, title, state, draft, html_url, created_at, updated_at, merged_at)
      values ($1, $2, $7, $3, $4, false, $5, now(), now(), $6)`, [number, repository, `PR ${number}`, number === 2 ? "open" : "closed", `https://github.com/test/core/pull/${number}`, number === 1 ? new Date() : null, number]);
    await pool.query("UPDATE github_pull_requests SET base_ref='main'");
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
  it("counts a planned GitHub PR merged into an intermediate branch without claiming release readiness", async () => {
    const pool = getDatabasePool(source);
    const id = (await pool.query("SELECT id FROM repositories WHERE full_name='test/core'")).rows[0].id;
    try {
      await pool.query("UPDATE github_pull_requests SET merged_at=now(),base_ref='integration',release_included=NULL WHERE repository_id=$1 AND number=3", [id]);
      const portfolio = await loadPortfolioOverview(source);
      const project = portfolio.projects.find(p=>p.slug==='database-fixture')!;
      expect(project).toMatchObject({ planned:4, completed:2, percent:50 });
      const dashboard = await loadProjectDashboard("database-fixture", source);
      expect(dashboard.progress).toMatchObject({ planned:4, completed:2, remaining:2, percent:50 });
      expect(dashboard.graph?.plannedPullRequests[2].status).toBe("merged");
    } finally {
      await pool.query("UPDATE github_pull_requests SET merged_at=NULL,base_ref='main',release_included=NULL WHERE repository_id=$1 AND number=3", [id]);
    }
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
  it("imports scoped financial adapters with exact decimals and rolls back conflicting invoices", async () => {
    const data = await loadProjectDashboard("database-fixture", source), pool = getDatabasePool(source);
    const credential: TelemetryCredential = { id: "integration-billing", secret: "test-secret-with-at-least-32-bytes", projectId: data.project!.id, environment: "production", source: "adapter-billing", adapter: "finance-json-v1", capabilities: ["financial-entry", "financial-forecast"], evidenceTransitions: [] };
    const entry = { id: "adapter-invoice", date: "2026-10-01", kind: "cost", category: "hosting", currency: "USD", amount: "0.29" };
    const normalize = (id: string, entries: unknown[]) => normalizeTelemetry(Buffer.from(JSON.stringify({ version: 1, deliveryId: id, entries })), credential);
    const batch = normalize("financial-adapter-1", [entry]);
    expect(await ingestTelemetry(credential, batch, "5".repeat(64))).toBe("accepted");
    expect(await ingestTelemetry(credential, batch, "5".repeat(64))).toBe("duplicate");
    expect((await loadFinanceOverview(source)).entries.find((record) => record.source === "adapter-billing")?.amountMinor).toBe(29);
    await expect(ingestTelemetry(credential, normalize("financial-adapter-conflict", [{ ...entry, id: "must-rollback" }, { ...entry, amount: "1.00" }]), "6".repeat(64))).rejects.toMatchObject({ status: 409 });
    expect((await pool.query("select 1 from project_financial_entries where external_id='must-rollback'")).rows).toHaveLength(0);
    expect((await pool.query("select 1 from telemetry_deliveries where delivery_id='financial-adapter-conflict'")).rows).toHaveLength(0);
  });
  it("loads latest identity observations, deduplicates replay, and ignores late older status", async () => {
    const data = await loadProjectDashboard("database-fixture", source);
    const record = { projectId: data.project!.id, environment: "production", source: "fixture-identity", externalId: "user-current", principalId: "operator", displayName: "Operator", principalKind: "person" as const, status: "suspended" as const, roles: ["admin"], privileged: true, mfaEnabled: null, lastActiveAt: null, credentialExpiresAt: null, observedAt: new Date().toISOString() };
    await recordAccessObservations([record]); await recordAccessObservations([record]);
    await recordAccessObservations([{ ...record, externalId: "user-older", status: "active", observedAt: new Date(Date.now()-60_000).toISOString() }]);
    const overview = await loadAccessOverview(source);
    expect(overview.source).toBe("database"); expect(overview.principals).toHaveLength(1);
    expect(overview.principals[0]).toMatchObject({ status: "suspended", mfaEnabled: null, roles: ["admin"] });
    await expect(recordAccessObservations([{ ...record, status: "active" }])).rejects.toThrow("different content");
  });

  const repoPayload={id:99,name:'core',full_name:'test/core',owner:{login:'test'},html_url:'https://github.com/test/core',default_branch:'main'};
  const prPayload=(number:number,overrides:Record<string,unknown>={})=>({id:9000+number,number,title:'Work '+number,state:'open',draft:false,
    html_url:'https://github.com/test/core/pull/'+number,user:{login:'test'},created_at:'2026-10-01T00:00:00Z',
    updated_at:new Date().toISOString(),head:{sha:'a'.repeat(40)},base:{ref:'main'},...overrides});
  const syncEnv:NodeJS.ProcessEnv={NODE_ENV:'test',ENGINE_ROOM_GITHUB_OWNER:'test',GITHUB_READ_TOKEN:'synthetic-read-token'};

  it('applies and acknowledges durable events atomically, ignores replay, and retries malformed deliveries',async()=>{
    const pool=getDatabasePool(source);
    const payload={repository:repoPayload,pull_request:prPayload(80)};
    expect(await recordGitHubWebhookDelivery({deliveryId:'durable-pr',event:'pull_request',payload})).toBe('inserted');
    expect(await processWebhookInbox(pool,{env:syncEnv})).toEqual({processed:1,failed:0});
    expect(await recordGitHubWebhookDelivery({deliveryId:'durable-pr',event:'pull_request',payload})).toBe('duplicate');
    expect(await processWebhookInbox(pool,{env:syncEnv})).toEqual({processed:0,failed:0});
    const brokenRepo={...repoPayload,id:999,name:'partial-failure',full_name:'test/partial-failure'};
    await recordGitHubWebhookDelivery({deliveryId:'retry-pr',event:'pull_request',payload:{repository:brokenRepo,pull_request:{}}});
    expect(await processWebhookInbox(pool,{env:syncEnv})).toEqual({processed:0,failed:1});
    expect((await pool.query('SELECT 1 FROM repositories WHERE github_repository_id=999')).rowCount).toBe(0);
    expect((await pool.query("SELECT processed_at,attempts,processing_error FROM github_webhook_deliveries WHERE delivery_id='retry-pr'")).rows[0])
      .toMatchObject({processed_at:null,attempts:1,processing_error:expect.any(String)});
    await pool.query("UPDATE github_webhook_deliveries SET payload=$1::jsonb,next_attempt_at=now() WHERE delivery_id='retry-pr'",[JSON.stringify(payload)]);
    expect(await processWebhookInbox(pool,{env:syncEnv})).toEqual({processed:1,failed:0});
  });

  it('keeps newer PR heads and check observations when old deliveries arrive after a restart',async()=>{
    const pool=getDatabasePool(source),repo=(await pool.query("SELECT id FROM repositories WHERE full_name='test/core'")).rows[0].id;
    const now=Date.now()+1000,newHead='b'.repeat(40),oldHead='a'.repeat(40);
    await persistPullRequest(pool,repo,prPayload(80,{head:{sha:newHead},updated_at:new Date(now).toISOString()}));
    await persistPullRequest(pool,repo,prPayload(80,{head:{sha:oldHead},updated_at:new Date(now-1000).toISOString()}));
    await persistChecks(pool,repo,[{id:'old-run',head_sha:oldHead,name:'Build',status:'completed',conclusion:'failure',observed_at:new Date(now).toISOString()}]);
    expect((await pool.query('SELECT head_sha,checks_state FROM github_pull_requests WHERE repository_id=$1 AND number=80',[repo])).rows[0])
      .toMatchObject({head_sha:newHead,checks_state:'unknown'});
    await persistChecks(pool,repo,[{id:'new-run',head_sha:newHead,name:'Build',status:'completed',conclusion:'failure',observed_at:new Date(now).toISOString()}]);
    await persistChecks(pool,repo,[{id:'new-run',head_sha:newHead,name:'Build',status:'completed',conclusion:'success',observed_at:new Date(now-1000).toISOString()}]);
    expect((await pool.query('SELECT checks_state FROM github_pull_requests WHERE repository_id=$1 AND number=80',[repo])).rows[0].checks_state).toBe('failing');
    await persistChecks(pool,repo,[{id:'rerun',head_sha:newHead,name:'Build',status:'completed',conclusion:'success',observed_at:new Date(now+1000).toISOString()}]);
    expect((await pool.query('SELECT checks_state FROM github_pull_requests WHERE repository_id=$1 AND number=80',[repo])).rows[0].checks_state).toBe('passing');
  });

  it('preserves original and added planned units without requiring default-branch release inclusion',async()=>{
    const pool=getDatabasePool(source),row=(await pool.query("SELECT r.id,pr.project_id FROM repositories r JOIN project_repositories pr ON pr.repository_id=r.id WHERE r.full_name='test/core'")).rows[0];
    const repo={id:row.id,full_name:'test/core'};
    const one={ordinal:1,title:'Foundation',numbers:[1],reason:'Explicit source evidence',scope:'original'};
    const two={ordinal:2,title:'Future work',numbers:[],reason:null,scope:'original'};
    await persistPlanDocument(pool,repo,{path:'docs/roadmap.md',body:'Original',ref:'original-sha',items:[one,two]});
    await persistPullRequest(pool,row.id,prPayload(80,{state:'closed',merged_at:new Date().toISOString(),updated_at:new Date(Date.now()+2000).toISOString(),base:{ref:'integration'}}));
    const added={ordinal:3,title:'Later work',numbers:[80,81],reason:'Explicit multi-PR source evidence',scope:'original'};
    await persistPullRequest(pool,row.id,prPayload(81));
    await persistPlanDocument(pool,repo,{path:'docs/roadmap.md',body:'Revision 2',ref:'second-sha',items:[one,two,added]});
    let plan=(await loadProjectMonitorData(pool,row.project_id)).plans.get(row.project_id)!;
    expect(plan).toMatchObject({original:2,originalComplete:1,added:1,addedComplete:0,unmapped:1});
    expect(plan.items.find(x=>x.ordinal===3)?.state).toBe('in-progress');
    await persistPullRequest(pool,row.id,prPayload(80,{state:'closed',merged_at:new Date().toISOString(),updated_at:new Date(Date.now()+3000).toISOString()}));
    await persistPullRequest(pool,row.id,prPayload(81,{state:'closed',merged_at:new Date().toISOString(),updated_at:new Date(Date.now()+3000).toISOString()}));
    const revision=(await pool.query('SELECT revision FROM engine_room_live_state')).rows[0].revision;
    await persistPlanDocument(pool,repo,{path:'docs/roadmap.md',body:'Revision 2',ref:'second-sha',items:[one,two,added]});
    expect((await pool.query('SELECT revision FROM engine_room_live_state')).rows[0].revision).toBe(revision);
    await persistPlanDocument(pool,repo,{path:'docs/roadmap.md',body:'Revision 3',ref:'third-sha',items:[{...one,title:'Replacement scope'},two]});
    await persistPlanDocument(pool,repo,{path:'docs/roadmap.md',body:'Revision 4',ref:'fourth-sha',items:[one,two]});
    plan=(await loadProjectMonitorData(pool,row.project_id)).plans.get(row.project_id)!;
    expect(plan).toMatchObject({original:2,originalComplete:1,added:2,addedComplete:2});
    expect(plan.items.some(x=>x.title==='Foundation'&&x.scope==='original')).toBe(true);
    expect(plan.documents[0].versions).toBe(4);
  });

  it('notifies refresh clients when the same source gains new completion mappings',async()=>{
    const pool=getDatabasePool(source),row=(await pool.query("SELECT id FROM repositories WHERE full_name='test/core'")).rows[0];
    const repo={id:row.id,full_name:'test/core'},item={ordinal:2,title:'Future work',numbers:[81],reason:'Reviewed source evidence',scope:'original'};
    const revision=BigInt((await pool.query('SELECT revision FROM engine_room_live_state')).rows[0].revision);
    await persistPlanDocument(pool,repo,{path:'docs/roadmap.md',body:'Revision 4',ref:'fourth-sha',items:[item]});
    expect(BigInt((await pool.query('SELECT revision FROM engine_room_live_state')).rows[0].revision)).toBeGreaterThan(revision);
  });

  it('isolates repository failures and resumes from the last successful checkpoint',async()=>{
    const pool=getDatabasePool(source),second={...repoPayload,id:600,name:'second',full_name:'test/second'};
    const fetcher:typeof fetch=async(input)=>{
      const u=String(input);
      if(u.includes('/users/test/repos'))return Response.json([repoPayload,second]);
      if(u.includes('/repos/test/core/pulls?'))return new Response('Unavailable',{status:503});
      if(u.includes('/repos/test/second/pulls?'))return Response.json([]);
      if(u.includes('/repos/test/second/commits/main'))return Response.json({sha:'c'.repeat(40)});
      if(u.startsWith('https://raw.githubusercontent.com/'))return new Response('',{status:404});
      throw new Error('Unexpected fixture request '+u);
    };
    const result=await reconcilePortfolio(pool,{env:syncEnv,fetcher,force:true});
    expect(result).toMatchObject({repositories:1,failed:1});
    const checkpoints=(await pool.query('SELECT r.name,s.last_success_at,s.last_error FROM github_repository_sync s JOIN repositories r ON r.id=s.repository_id')).rows;
    expect(checkpoints.find(x=>x.name==='core')).toMatchObject({last_success_at:null,last_error:expect.any(String)});
    expect(checkpoints.find(x=>x.name==='second')).toMatchObject({last_success_at:expect.any(Date),last_error:null});
    expect((await pool.query('SELECT 1 FROM github_pull_requests WHERE number=80')).rowCount).toBe(1);
  });

  it('honors provider backoff without discarding data or repeating requests',async()=>{
    const pool=getDatabasePool(source);
    let calls=0;
    const fetcher:typeof fetch=async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':'120'}});};
    expect(await reconcilePortfolio(pool,{env:syncEnv,fetcher,force:true})).toMatchObject({rateLimited:true});
    expect(await reconcilePortfolio(pool,{env:syncEnv,fetcher,force:true})).toMatchObject({rateLimited:true});
    expect(calls).toBe(1);
    expect((await pool.query('SELECT count(*) FROM github_pull_requests')).rows[0].count).not.toBe('0');
  });

  it('keeps roadmap completion separate when release inclusion is no longer verified',async()=>{
    const pool=getDatabasePool(source),row=(await pool.query("SELECT r.id,pr.project_id FROM repositories r JOIN project_repositories pr ON pr.repository_id=r.id WHERE r.full_name='test/core'")).rows[0];
    await pool.query('UPDATE engine_room_live_state SET rate_limit_reset_at=NULL,discovery_at=now()');
    await pool.query("UPDATE github_repository_sync SET next_attempt_at=now() WHERE repository_id=$1",[row.id]);
    await pool.query("UPDATE github_pull_requests SET state='closed' WHERE repository_id=$1",[row.id]);
    const pr=prPayload(85,{state:'closed',merged_at:new Date().toISOString(),base:{ref:'integration'},merge_commit_sha:'d'.repeat(40)});
    const fetcher:typeof fetch=async(input)=>{
      const u=String(input);
      if(u.includes('/repos/test/core/pulls?'))return Response.json([pr]);
      if(u.includes('/repos/test/core/commits/main'))return Response.json({sha:'c'.repeat(40)});
      if(u.includes('/compare/'))return Response.json({status:'behind'});
      if(u.startsWith('https://raw.githubusercontent.com/'))return new Response('',{status:404});
      throw new Error('Unexpected ancestry request '+u);
    };
    expect(await reconcilePortfolio(pool,{env:syncEnv,fetcher})).toMatchObject({repositories:1,failed:0});
    await persistPlanDocument(pool,{id:row.id,full_name:'test/core'},{path:'docs/ancestry.md',body:'Ancestry source',ref:'fixture',items:[
      {ordinal:1,title:'Ancestry work',numbers:[85],reason:'Explicit source mapping',scope:'original'}]});
    let data=await loadProjectMonitorData(pool,row.project_id);
    expect(data.pullRequests.get(row.project_id)?.find(x=>x.number===85)?.releaseMerge).toBe(true);
    expect(data.plans.get(row.project_id)?.items.find(x=>x.title==='Ancestry work')?.state).toBe('merged');
    await pool.query("UPDATE github_repository_sync SET default_branch_sha=$2 WHERE repository_id=$1",[row.id,'e'.repeat(40)]);
    data=await loadProjectMonitorData(pool,row.project_id);
    expect(data.pullRequests.get(row.project_id)?.find(x=>x.number===85)?.releaseMerge).toBeNull();
    expect(data.plans.get(row.project_id)?.items.find(x=>x.title==='Ancestry work')?.state).toBe('merged');
  });

  it('reads real dashboard account roles and disabled states without inventing MFA or usage',async()=>{
    const pool=getDatabasePool(source),projectId=randomUUID(),adminId=randomUUID(),viewerId=randomUUID();
    await pool.query("INSERT INTO projects(id,slug,display_name,status) VALUES($1,'engine-room','Engine Room','active-development')",[projectId]);
    await pool.query("INSERT INTO engine_room_users(id,email,display_name,password_hash,role,disabled) VALUES($1,$2,'Own admin','fixture','admin',false),($3,$4,'Disabled viewer','fixture','viewer',true)",[adminId,adminId+'@example.invalid',viewerId,viewerId+'@example.invalid']);
    const accounts=(await loadAccessOverview(source)).principals.filter(x=>x.source==='engine-room-auth');
    expect(accounts).toHaveLength(2);
    expect(accounts.find(x=>x.principalId===adminId)).toMatchObject({status:'active',roles:['admin'],privileged:true,mfaEnabled:null,lastActiveAt:null});
    expect(accounts.find(x=>x.principalId===viewerId)).toMatchObject({status:'suspended',roles:['viewer'],privileged:false});
    await pool.query('DELETE FROM engine_room_users WHERE id=ANY($1::uuid[])',[[adminId,viewerId]]);
    await pool.query('DELETE FROM projects WHERE id=$1',[projectId]);
  });

  it('reports a measured database probe rather than assuming all project databases are healthy',async()=>{
    const result=await loadDatabaseReadout(getDatabasePool(source));
    expect(result.state).toBe('observed');
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.probeMs).toBeGreaterThanOrEqual(0);
  });
});
