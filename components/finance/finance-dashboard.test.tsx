import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it } from "vitest";
import { FinanceDashboard } from "./finance-dashboard";

it("shows missing finance as unknown and filters currencies without converting", () => {
  render(<FinanceDashboard initialPeriod="2026-10" overview={{ source: "database", projects: [{ id: "p", slug: "core", displayName: "Core" }], forecasts: [], entries: [{ projectId: "p", environment: "production", source: "billing", externalId: "1", kind: "cost", category: "hosting", currency: "EUR", amountMinor: 1250, occurredOn: "2026-10-01" }] }} />);
  expect(screen.getAllByText("Unknown").length).toBeGreaterThan(1);
  fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "EUR" } });
  expect(screen.getAllByText("€12.50").length).toBe(4);
  expect(screen.getByText("Partial or missing actuals")).toBeInTheDocument();
});
