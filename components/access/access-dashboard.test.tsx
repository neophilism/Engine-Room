import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it } from "vitest";
import { AccessDashboard } from "./access-dashboard";

it("searches source identities while showing unknown MFA and explicit status", () => {
  const observedAt = new Date().toISOString();
  render(<AccessDashboard evaluatedAt={observedAt} overview={{ source: "database", principals: [{ projectId: "p", projectName: "Core", projectSlug: "core", environment: "production", source: "identity", externalId: "obs-1", principalId: "user-1", displayName: "Operator", principalKind: "person", status: "active", roles: ["admin"], privileged: true, mfaEnabled: null, lastActiveAt: null, credentialExpiresAt: null, observedAt }] }} />);
  expect(screen.getByText("MFA unknown")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Search identities"), { target: { value: "missing" } });
  expect(screen.getByText("No identities match this view.")).toBeInTheDocument();
});
