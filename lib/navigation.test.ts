import { describe, expect, it } from "vitest";
import { dashboardRoutes, getDashboardRoute } from "./navigation";

describe("dashboard route registry", () => {
  it("keeps route hrefs unique", () => {
    const hrefs = dashboardRoutes.map((route) => route.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("includes the complete main navigation", () => {
    expect(dashboardRoutes.map((route) => route.label)).toEqual([
      "Home",
      "Projects",
      "Finance",
      "Users",
      "Operations",
      "Releases",
      "Alerts",
      "About",
      "Settings"
    ]);
  });

  it("resolves a route by href", () => {
    expect(getDashboardRoute("/operations")?.label).toBe("Operations");
  });
});
