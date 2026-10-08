import { currencies, validateFinancialEntry, validateFinancialForecast, type Currency } from "../domain/finance";
import type { TelemetryCredential, TelemetryEnvelope, TelemetryRecord } from "../telemetry/types";

function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !keys.includes(key))) throw new Error("Unexpected financial field.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 200) { if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid financial text."); return value; }
function currency(value: unknown): Currency { const name = text(value, 3); if (!Object.hasOwn(currencies, name)) throw new Error("Unsupported currency."); return name as Currency; }
function identity(value: unknown) { const name = text(value); if (!/^[A-Za-z0-9._:-]+$/.test(name)) throw new Error("Invalid financial identity."); return name; }
function timestamp(value: unknown) {
  const valueText = text(value, 40), date = new Date(valueText);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(valueText) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,19) !== valueText.slice(0,19)) throw new Error("Invalid financial timestamp.");
  return date.toISOString();
}
export function parseDecimalMoney(value: unknown, unit: Currency) {
  const decimal = text(value, 40);
  if (!/^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(decimal)) throw new Error("Money must be a plain decimal string.");
  const negative = decimal.startsWith("-"), [whole, fraction = ""] = decimal.replace(/^-/, "").split("."), digits = currencies[unit];
  if (fraction.length > digits) throw new Error("Amount exceeds currency precision.");
  const amount = BigInt(whole) * BigInt(10) ** BigInt(digits) + BigInt(fraction.padEnd(digits, "0") || "0"), signed = negative ? -amount : amount;
  if (signed > BigInt(Number.MAX_SAFE_INTEGER) || signed < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error("Amount exceeds supported range.");
  return Number(signed);
}
export function normalizeFinanceRecord(value: unknown, credential: TelemetryCredential): TelemetryRecord {
  const item = object(value, ["kind", "externalId", "direction", "category", "currency", "amountMinor", "occurredOn", "description", "period", "costMinor", "revenueMinor", "observedAt"]);
  const scope = { projectId: credential.projectId, environment: credential.environment, source: credential.source };
  if (item.kind === "financial-entry") {
    object(item, ["kind", "externalId", "direction", "category", "currency", "amountMinor", "occurredOn", "description"]);
    if (item.direction !== "cost" && item.direction !== "revenue") throw new Error("Unknown financial direction.");
    if (typeof item.amountMinor !== "number" || (item.description !== undefined && typeof item.description !== "string")) throw new Error("Invalid financial amount or description.");
    const entry = { externalId: identity(item.externalId), kind: item.direction as "cost" | "revenue", category: text(item.category, 64), currency: currency(item.currency), amountMinor: item.amountMinor, occurredOn: text(item.occurredOn, 10), description: item.description as string | undefined };
    validateFinancialEntry({ ...scope, ...entry }); return { kind: "financial-entry", entry };
  }
  if (item.kind === "financial-forecast") {
    object(item, ["kind", "externalId", "currency", "period", "costMinor", "revenueMinor", "observedAt"]);
    if (typeof item.costMinor !== "number" || typeof item.revenueMinor !== "number") throw new Error("Invalid forecast amount.");
    const forecast = { externalId: identity(item.externalId), currency: currency(item.currency), period: text(item.period, 7), costMinor: item.costMinor, revenueMinor: item.revenueMinor, observedAt: timestamp(item.observedAt) };
    validateFinancialForecast({ ...scope, ...forecast }); return { kind: "financial-forecast", forecast };
  }
  throw new Error("Unknown financial record.");
}
export function parseFinanceCsv(csv: string): Record<string, string>[] {
  if (csv.length > 65_536) throw new Error("CSV is too large.");
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false, closed = false;
  const finishField = () => { row.push(field); field = ""; closed = false; };
  const finishRow = () => { finishField(); rows.push(row); row = []; if (rows.length > 101) throw new Error("CSV has too many rows."); };
  for (let index = 0; index < csv.length; index++) {
    const char = csv[index];
    if (quoted) {
      if (char === '"') { if (csv[index + 1] === '"') { field += '"'; index++; } else { quoted = false; closed = true; } }
      else field += char;
    } else if (char === ",") finishField();
    else if (char === "\n" || char === "\r") { if (char === "\r" && csv[index + 1] === "\n") index++; finishRow(); }
    else if (closed) throw new Error("Unexpected text after CSV quote.");
    else if (char === '"') { if (field.length) throw new Error("Unexpected CSV quote."); quoted = true; }
    else field += char;
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  if (field.length || row.length || closed) finishRow();
  const header = rows.shift();
  if (!header || header.length === 0 || new Set(header).size !== header.length) throw new Error("Invalid CSV header.");
  const allowed = ["id", "date", "kind", "category", "currency", "amount", "description", "period", "cost", "revenue", "observedAt"];
  if (header.some((key) => !allowed.includes(key))) throw new Error("Unsupported CSV column.");
  return rows.map((fields) => {
    if (fields.length !== header.length) throw new Error("CSV column count differs from header.");
    return Object.fromEntries(header.map((name, index) => [name, fields[index]]));
  });
}
function array(value: unknown) { if (value === undefined) return []; if (!Array.isArray(value) || value.length > 100) throw new Error("Invalid financial record count."); return value; }
function entryRecord(value: unknown, credential: TelemetryCredential) {
  const item = object(value, ["id", "date", "kind", "category", "currency", "amount", "description"]), unit = currency(item.currency);
  return normalizeFinanceRecord({ kind: "financial-entry", externalId: item.id, direction: item.kind, category: item.category, currency: unit, amountMinor: parseDecimalMoney(item.amount, unit), occurredOn: item.date, description: item.description === "" ? undefined : item.description }, credential);
}
function forecastRecord(value: unknown, credential: TelemetryCredential) {
  const item = object(value, ["id", "period", "currency", "cost", "revenue", "observedAt"]), unit = currency(item.currency);
  return normalizeFinanceRecord({ kind: "financial-forecast", externalId: item.id, currency: unit, period: item.period, costMinor: parseDecimalMoney(item.cost, unit), revenueMinor: parseDecimalMoney(item.revenue, unit), observedAt: item.observedAt }, credential);
}
export function normalizeFinancialAdapter(value: unknown, credential: TelemetryCredential): TelemetryEnvelope {
  const item = object(value, credential.adapter === "finance-csv-v1" ? ["version", "deliveryId", "mode", "csv"] : ["version", "deliveryId", "entries", "forecasts"]);
  if (item.version !== 1) throw new Error("Unsupported finance version.");
  let records: TelemetryRecord[];
  if (credential.adapter === "finance-csv-v1") {
    if (item.mode !== "entries" && item.mode !== "forecasts") throw new Error("Unknown CSV mode.");
    records = parseFinanceCsv(text(item.csv, 65_536)).map((row) => item.mode === "entries" ? entryRecord(row, credential) : forecastRecord(row, credential));
  } else records = [...array(item.entries).map((entry) => entryRecord(entry, credential)), ...array(item.forecasts).map((record) => forecastRecord(record, credential))];
  if (!records.length || records.length > 100) throw new Error("A financial delivery requires 1–100 records.");
  return { deliveryId: identity(item.deliveryId), records };
}
