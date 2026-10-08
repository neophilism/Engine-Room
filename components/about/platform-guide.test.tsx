import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformGuide } from "./platform-guide";
import { dashboardRoutes } from "../../lib/navigation";

describe("Engine Room onboarding guide", () => {
  it("offers eight working dashboard destinations", () => {
    render(<PlatformGuide />);
    for (const route of dashboardRoutes.filter(route => route.href !== "/about")) {
      expect(screen.getByRole("link", { name: `Open ${route.href === "/" ? "Portfolio" : route.label} dashboard` })).toHaveAttribute("href", route.href);
    }
  });
  it("explains verified progress and unknown source state", () => {
    render(<PlatformGuide />);
    expect(screen.getByText(/Merged mapped PRs \/ approved planned PR total/)).toBeInTheDocument();
    expect(screen.getByText(/No trustworthy recent observation is available/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /External sources feed a normalized database/ })).toBeInTheDocument();
  });
});
