export const currencies = { USD: 2, EUR: 2, GBP: 2, CAD: 2, AUD: 2, JPY: 0, KWD: 3 } as const;
export type Currency = keyof typeof currencies;
export type FinancialEntry = { projectId: string; environment: string; source: string; externalId: string; kind: "cost" | "revenue"; category: string; currency: Currency; amountMinor: number; occurredOn: string; description?: string };
export type FinancialForecast = { projectId: string; environment: string; source: string; externalId: string; currency: Currency; period: string; costMinor: number; revenueMinor: number; observedAt: string };
export type FinanceProject = { id: string; slug: string; displayName: string };
export type FinanceOverview = { source: "database" | "unconfigured" | "error"; projects: FinanceProject[]; entries: FinancialEntry[]; forecasts: FinancialForecast[] };

function validDate(value: string) { const time = new Date(value + "T00:00:00Z"); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(time.getTime()) && time.toISOString().slice(0, 10) === value; }
export function validFinancePeriod(value: string) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(value); }
function validateIdentity(record: { projectId: string; environment: string; source: string; externalId: string; currency: Currency }) {
  if (!record.projectId || !/^[a-z0-9-]{1,64}$/.test(record.environment) || !/^[A-Za-z0-9._-]{1,128}$/.test(record.source) || !/^[A-Za-z0-9._:-]{1,200}$/.test(record.externalId) || !Object.hasOwn(currencies, record.currency)) throw new Error("Invalid financial identity or currency.");
}
export function validateFinancialEntry(entry: FinancialEntry) {
  validateIdentity(entry);
  if (!["cost", "revenue"].includes(entry.kind) || !/^[a-z0-9-]{1,64}$/.test(entry.category) || !Number.isSafeInteger(entry.amountMinor) || !validDate(entry.occurredOn) || (entry.description !== undefined && entry.description.length > 500)) throw new Error("Invalid financial entry.");
}
export function validateFinancialForecast(forecast: FinancialForecast) {
  validateIdentity(forecast);
  if (!validFinancePeriod(forecast.period) || !Number.isSafeInteger(forecast.costMinor) || forecast.costMinor < 0 || !Number.isSafeInteger(forecast.revenueMinor) || forecast.revenueMinor < 0 || !Number.isFinite(new Date(forecast.observedAt).getTime()) || new Date(forecast.observedAt).getTime() > Date.now() + 300_000) throw new Error("Invalid financial forecast.");
}
export function summarizeProjectFinance(projectId: string, period: string, currency: Currency, environment: string, entries: readonly FinancialEntry[], forecasts: readonly FinancialForecast[]) {
  const actuals = entries.filter((entry) => entry.projectId === projectId && entry.environment === environment && entry.currency === currency && entry.occurredOn.slice(0, 7) === period);
  const cost = actuals.filter((entry) => entry.kind === "cost"), revenue = actuals.filter((entry) => entry.kind === "revenue");
  const sum = (records: readonly FinancialEntry[]) => records.reduce((total, entry) => total + BigInt(entry.amountMinor), BigInt(0));
  const costMinor = cost.length ? sum(cost).toString() : null, revenueMinor = revenue.length ? sum(revenue).toString() : null;
  const forecast = forecasts.filter((record) => record.projectId === projectId && record.environment === environment && record.currency === currency && record.period === period)
    .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime() || a.source.localeCompare(b.source) || a.externalId.localeCompare(b.externalId))[0];
  return { costMinor, revenueMinor, netMinor: costMinor !== null && revenueMinor !== null ? (BigInt(revenueMinor) - BigInt(costMinor)).toString() : null, forecast: forecast ?? null };
}
export function formatMoney(amountMinor: string | number | null, currency: Currency) {
  if (amountMinor === null) return "Unknown";
  const value = BigInt(amountMinor), digits = currencies[currency], scale = BigInt(10) ** BigInt(digits), absolute = value < BigInt(0) ? -value : value, whole = absolute / scale;
  const signedWhole = value < BigInt(0) ? whole === BigInt(0) ? -0 : -whole : whole;
  const fraction = (absolute % scale).toString().padStart(digits, "0");
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).formatToParts(signedWhole)
    .map((part) => part.type === "fraction" ? fraction : part.value).join("");
}
