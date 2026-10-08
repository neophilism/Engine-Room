import React from "react";
import { formatMoney, summarizeProjectFinance, type Currency, type FinanceOverview } from "../../lib/domain/finance";
import { FlowStation, MachineFlow } from "../machine";

export function FinancialFlow({ overview, period, currency, environment }: { overview: FinanceOverview; period: string; currency: Currency; environment: string }) {
  const summaries = overview.projects.map((project) => summarizeProjectFinance(project.id, period, currency, environment, overview.entries, overview.forecasts));
  const total = (key: "costMinor" | "revenueMinor") => summaries.some((summary) => summary[key] !== null) ? summaries.reduce((sum, summary) => sum + BigInt(summary[key] ?? "0"), BigInt(0)).toString() : null;
  const cost = total("costMinor"), revenue = total("revenueMinor"), net = cost !== null && revenue !== null ? (BigInt(revenue) - BigInt(cost)).toString() : null;
  const forecasts = summaries.flatMap((summary) => summary.forecast ? [summary.forecast] : []);
  const forecastNet = forecasts.length ? forecasts.reduce((sum, forecast) => sum + BigInt(forecast.revenueMinor) - BigInt(forecast.costMinor), BigInt(0)).toString() : null;
  const drivers = new Map<string, bigint>();
  for (const entry of overview.entries.filter((entry) => entry.environment === environment && entry.currency === currency && entry.occurredOn.slice(0,7) === period && entry.kind === "cost")) drivers.set(entry.category, (drivers.get(entry.category) ?? BigInt(0)) + BigInt(entry.amountMinor));
  const magnitude = (value: bigint) => value < BigInt(0) ? -value : value;
  const largest = [...drivers.values()].reduce((max, value) => magnitude(value) > max ? magnitude(value) : max, BigInt(0));
  return <div className="financial-flow">
    <MachineFlow label="Recorded financial flow" state="neutral">
      <FlowStation title="Recorded cost" eyebrow="Outflow" state={cost === null ? "neutral" : "active"} detail={formatMoney(cost, currency)} />
      <FlowStation title="Recorded revenue" eyebrow="Inflow" state={revenue === null ? "neutral" : "active"} detail={formatMoney(revenue, currency)} />
      <FlowStation title="Recorded net" eyebrow="Imported balance" state={net === null ? "neutral" : BigInt(net) < BigInt(0) ? "warning" : "active"} detail={formatMoney(net, currency)} />
      <FlowStation title="Forecast net" eyebrow="Separate estimate" state={forecastNet === null ? "neutral" : "active"} detail={`${formatMoney(forecastNet, currency)} · ${forecasts.length}/${summaries.length} projects`} />
    </MachineFlow>
    <h3>Recorded cost drivers</h3>{drivers.size === 0 ? <p>No cost drivers have been recorded for this scope.</p> : <ul className="financial-drivers">{[...drivers.entries()].sort((a,b) => magnitude(a[1]) > magnitude(b[1]) ? -1 : magnitude(a[1]) < magnitude(b[1]) ? 1 : a[0].localeCompare(b[0])).map(([category, value]) => <li key={category}><span>{category}</span><strong>{formatMoney(value.toString(), currency)}</strong><div className="financial-driver-track" aria-hidden="true"><span style={{ width: `${largest > BigInt(0) ? Number(magnitude(value) * BigInt(10000) / largest) / 100 : 0}%` }} /></div></li>)}</ul>}
  </div>;
}
