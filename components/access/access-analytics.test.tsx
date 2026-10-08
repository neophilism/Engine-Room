import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AccessAnalytics } from "./access-analytics";

it("keeps unavailable security coverage explicit instead of displaying a clean posture", () => {
  render(<AccessAnalytics overview={{ source: "error", principals: [] }} evaluatedAt={new Date().toISOString()} />);
  expect(screen.getByText("Access analytics are unavailable.")).toBeInTheDocument();
  expect(screen.queryByText("Unique recorded identities")).not.toBeInTheDocument();
  expect(screen.queryByText(/No findings in/)).not.toBeInTheDocument();
});
