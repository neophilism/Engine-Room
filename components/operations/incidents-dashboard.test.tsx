import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { IncidentsDashboard } from "./incidents-dashboard";

it("filters open incidents and makes recorded resolutions discoverable", () => {
  const base = { projectId: "p", projectName: "Core", projectSlug: "core", environment: "production", source: "monitor", severity: "critical" as const, occurredAt: "2026-10-08T00:00:00Z", updatedAt: "2026-10-08T00:00:00Z", lastNote: null };
  render(<IncidentsDashboard overview={{ source: "database", incidents: [{ ...base, id: "a", externalId: "a", title: "Active outage", state: "detected", resolvedAt: null }, { ...base, id: "b", externalId: "b", title: "Recovered outage", state: "resolved", resolvedAt: base.occurredAt }] }} />);
  expect(screen.getByText("1 open · 1 critical")).toBeInTheDocument();
  expect(screen.queryByText("Recovered outage")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Incident state"), { target: { value: "resolved" } });
  expect(screen.getByText("Recovered outage")).toBeInTheDocument();
  expect(screen.queryByText("Active outage")).not.toBeInTheDocument();
});
