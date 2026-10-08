import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { getRuntimeConfig, type EnvironmentSource } from "../config/env";
import { validateFinancialEntry, validateFinancialForecast, type FinancialEntry, type FinancialForecast, type FinanceOverview, type FinanceProject, type Currency } from "../domain/finance";
import { getDatabasePool } from "./database";

export async function persistFinancialEntries(client: Pick<PoolClient, "query">, entries: readonly FinancialEntry[]) {
  entries.forEach(validateFinancialEntry);
  for (const entry of entries) {
    const hash = createHash("sha256").update(JSON.stringify([entry.kind, entry.category, entry.currency, entry.amountMinor, entry.occurredOn, entry.description ?? null])).digest("hex");
    const inserted = await client.query(`insert into project_financial_entries (project_id, environment, source, external_id, kind, category, currency, amount_minor, occurred_on, description, payload_hash)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict (project_id, environment, source, external_id) do nothing returning external_id`,
    [entry.projectId, entry.environment, entry.source, entry.externalId, entry.kind, entry.category, entry.currency, entry.amountMinor, entry.occurredOn, entry.description ?? null, hash]);
    if (!inserted.rows.length) {
      const previous = await client.query<{ payload_hash: string }>("select payload_hash from project_financial_entries where project_id=$1 and environment=$2 and source=$3 and external_id=$4", [entry.projectId, entry.environment, entry.source, entry.externalId]);
      if (previous.rows[0].payload_hash !== hash) throw new Error("Financial entry identity was reused with different content.");
    }
  }
}
export async function persistFinancialForecasts(client: Pick<PoolClient, "query">, forecasts: readonly FinancialForecast[]) {
  forecasts.forEach(validateFinancialForecast);
  for (const record of forecasts) {
    const hash = createHash("sha256").update(JSON.stringify([record.currency, record.period, record.costMinor, record.revenueMinor, new Date(record.observedAt).toISOString()])).digest("hex");
    const inserted = await client.query(`insert into project_financial_forecasts (project_id, environment, source, external_id, currency, period, cost_minor, revenue_minor, observed_at, payload_hash)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (project_id, environment, source, external_id) do nothing returning external_id`,
    [record.projectId, record.environment, record.source, record.externalId, record.currency, record.period, record.costMinor, record.revenueMinor, record.observedAt, hash]);
    if (!inserted.rows.length) {
      const previous = await client.query<{ payload_hash: string }>("select payload_hash from project_financial_forecasts where project_id=$1 and environment=$2 and source=$3 and external_id=$4", [record.projectId, record.environment, record.source, record.externalId]);
      if (previous.rows[0].payload_hash !== hash) throw new Error("Financial forecast identity was reused with different content.");
    }
  }
}
export async function recordFinancialData(entries: readonly FinancialEntry[], forecasts: readonly FinancialForecast[] = []) {
  const client = await getDatabasePool().connect();
  try { await client.query("begin"); await persistFinancialEntries(client, entries); await persistFinancialForecasts(client, forecasts); await client.query("commit"); }
  catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
export async function loadFinanceOverview(source: EnvironmentSource = process.env): Promise<FinanceOverview> {
  if (!getRuntimeConfig(source).databaseUrl) return { source: "unconfigured", projects: [], entries: [], forecasts: [] };
  try {
    const client = await getDatabasePool(source).connect();
    try {
      await client.query("begin isolation level repeatable read read only");
      const projects = await client.query<FinanceProject>(`select id, slug, display_name as "displayName" from projects order by display_name`);
      const entries = await client.query<{ project_id: string; environment: string; source: string; external_id: string; kind: "cost" | "revenue"; category: string; currency: Currency; amount_minor: string; occurred_on: string; description: string | null }>("select project_id, environment, source, external_id, kind, category, currency, amount_minor, occurred_on::text as occurred_on, description from project_financial_entries order by occurred_on desc, external_id");
      const forecasts = await client.query<{ project_id: string; environment: string; source: string; external_id: string; currency: Currency; period: string; cost_minor: string; revenue_minor: string; observed_at: Date }>("select * from project_financial_forecasts order by observed_at desc, external_id");
      await client.query("commit");
      return { source: "database", projects: projects.rows,
        entries: entries.rows.map((row) => ({ projectId: row.project_id, environment: row.environment, source: row.source, externalId: row.external_id, kind: row.kind, category: row.category, currency: row.currency, amountMinor: Number(row.amount_minor), occurredOn: row.occurred_on, description: row.description ?? undefined })),
        forecasts: forecasts.rows.map((row) => ({ projectId: row.project_id, environment: row.environment, source: row.source, externalId: row.external_id, currency: row.currency, period: row.period, costMinor: Number(row.cost_minor), revenueMinor: Number(row.revenue_minor), observedAt: row.observed_at.toISOString() })) };
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
  } catch { return { source: "error", projects: [], entries: [], forecasts: [] }; }
}
