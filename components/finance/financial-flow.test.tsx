import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { FinancialFlow } from "./financial-flow";

it("shows recorded financial flow and keeps unavailable forecasts unknown", () => {
  render(<FinancialFlow period="2026-10" currency="USD" environment="production" overview={{ source: "database", projects: [{ id: "p", slug: "core", displayName: "Core" }], forecasts: [], entries: [{ projectId: "p", environment: "production", source: "billing", externalId: "1", kind: "cost", category: "hosting", currency: "USD", amountMinor: 1234, occurredOn: "2026-10-01" }] }} />);
  expect(screen.getAllByText("$12.34").length).toBe(2);
  expect(screen.getByText("hosting")).toBeInTheDocument();
  expect(screen.getByText("Unknown · 0/1 projects")).toBeInTheDocument();
});
