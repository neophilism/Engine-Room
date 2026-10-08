import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DevelopmentActivityTimeline } from "./development-activity";

describe("development activity timeline", () => {
  it("filters activity kinds and never creates unsafe external links", () => {
    render(<DevelopmentActivityTimeline activities={[{ repositoryFullName: "o/r", kind: "workflow", externalId: "1", title: "CI failed", url: "https://github.com/o/r/actions/runs/1", occurredAt: "2026-10-08T00:00:00Z", conclusion: "failure" },
      { repositoryFullName: "o/r", kind: "issue", externalId: "2", title: "Unsafe source URL", url: "javascript:alert(1)", occurredAt: "2026-10-08T00:00:00Z" }]} />);
    expect(screen.queryByRole("link", { name: "Unsafe source URL" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Activity type" }), { target: { value: "workflow" } });
    expect(screen.getByRole("link", { name: "CI failed ↗" })).toBeInTheDocument();
    expect(screen.queryByText("Unsafe source URL")).not.toBeInTheDocument();
  });
});
