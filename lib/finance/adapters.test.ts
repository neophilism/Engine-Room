// @vitest-environment node
import { expect, it } from "vitest";
import { normalizeTelemetry } from "../telemetry/adapters";
import type { TelemetryCredential } from "../telemetry/types";
import { parseDecimalMoney, parseFinanceCsv } from "./adapters";

const credential: TelemetryCredential = { id: "billing", secret: "test-secret-with-at-least-32-bytes", projectId: "00000000-0000-0000-0000-000000000001", environment: "production", source: "billing", adapter: "finance-json-v1", capabilities: ["financial-entry", "financial-forecast"], evidenceTransitions: [] };
it("converts decimal amounts exactly with explicit currency precision", () => {
  expect(parseDecimalMoney("0.29", "USD")).toBe(29);
  expect(parseDecimalMoney("-12.34", "USD")).toBe(-1234);
  expect(parseDecimalMoney("123", "JPY")).toBe(123);
  expect(parseDecimalMoney("1.234", "KWD")).toBe(1234);
  expect(() => parseDecimalMoney("1.001", "USD")).toThrow("precision");
  expect(() => parseDecimalMoney("1e3", "USD")).toThrow("decimal");
  expect(() => parseDecimalMoney("9007199254740992", "JPY")).toThrow("range");
});
it("parses quoted CSV fields and newlines while rejecting ambiguous or malformed imports", () => {
  const rows = parseFinanceCsv('id,date,kind,category,currency,amount,description\r\n1,2026-10-01,cost,hosting,USD,12.34,"Hosting, ""October""\nrenewal"\r\n');
  expect(rows[0].description).toBe('Hosting, "October"\nrenewal');
  expect(() => parseFinanceCsv('id,id\n1,2')).toThrow("header");
  expect(() => parseFinanceCsv('id,amount\n1,"12')).toThrow("Unclosed");
  expect(() => parseFinanceCsv('id,amount\n1,"12"x')).toThrow("Unexpected");
  expect(() => parseFinanceCsv('__proto__,amount\n1,2')).toThrow("column");
});
it("normalizes financial JSON and CSV through the signed scoped framework", () => {
  const body = Buffer.from(JSON.stringify({ version: 1, deliveryId: "invoice-1", entries: [{ id: "1", date: "2026-10-01", kind: "cost", category: "hosting", currency: "USD", amount: "0.29" }] }));
  expect(normalizeTelemetry(body, credential).records[0]).toMatchObject({ kind: "financial-entry", entry: { amountMinor: 29 } });
  expect(() => normalizeTelemetry(body, { ...credential, capabilities: ["metric"] })).toThrow("permissions");
  const csv = Buffer.from(JSON.stringify({ version: 1, deliveryId: "csv-1", mode: "entries", csv: "id,date,kind,category,currency,amount\n1,2026-10-01,revenue,sales,USD,20.00" }));
  expect(normalizeTelemetry(csv, { ...credential, adapter: "finance-csv-v1" }).records[0]).toMatchObject({ kind: "financial-entry", entry: { amountMinor: 2000, kind: "revenue" } });
});
