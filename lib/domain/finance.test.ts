import { describe, expect, it } from "vitest";
import { formatMoney, summarizeProjectFinance, validateFinancialEntry } from "./finance";

const base = { projectId: "p", environment: "production", source: "billing", externalId: "1", kind: "cost" as const, category: "hosting", currency: "USD" as const, amountMinor: 101, occurredOn: "2026-10-01" };
describe("currency-aware finance", () => {
  it("keeps missing actuals unknown and never mixes currencies, environments or months", () => {
    const entries = [base, { ...base, externalId: "2", currency: "EUR" as const, amountMinor: 10000 }, { ...base, externalId: "3", environment: "staging", amountMinor: 10000 }];
    expect(summarizeProjectFinance("p", "2026-10", "USD", "production", entries, [])).toMatchObject({ costMinor: "101", revenueMinor: null, netMinor: null, forecast: null });
    expect(summarizeProjectFinance("p", "2026-11", "USD", "production", entries, []).costMinor).toBeNull();
    expect(summarizeProjectFinance("p", "2026-10", "USD", "production", [...entries, { ...base, externalId: "4", kind: "revenue", amountMinor: 0 }], []).netMinor).toBe("-101");
  });
  it("uses exact minor-unit totals and preserves negative sub-unit values and currency precision", () => {
    expect(formatMoney(-1, "USD")).toBe("-$0.01");
    expect(formatMoney(1234, "JPY")).toBe("¥1,234");
    expect(formatMoney(1234, "KWD")).toContain("1.234");
    const summary = summarizeProjectFinance("p", "2026-10", "USD", "production", [base, { ...base, externalId: "large", amountMinor: Number.MAX_SAFE_INTEGER }], []);
    expect(summary.costMinor).toBe("9007199254741092");
    expect(formatMoney(summary.costMinor, "USD")).toBe("$90,071,992,547,410.92");
    expect(() => validateFinancialEntry({ ...base, amountMinor: 1.1 })).toThrow();
    expect(() => validateFinancialEntry({ ...base, occurredOn: "2026-02-30" })).toThrow();
  });
});
