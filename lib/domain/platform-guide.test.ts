import { describe, expect, it } from "vitest";
import { platformDefinitions, platformSections } from "./platform-guide";
import { dashboardRoutes } from "../navigation";
describe("platform onboarding content", () => {
  it("covers the published navigation, except the About page itself", () => {
    expect(platformSections.map(section=>section.path).sort()).toEqual(dashboardRoutes.filter(route=>route.href!=="/about").map(route=>route.href).sort());
  });
  it("explains evidence, unknown observations, and progress", () => {
    const text=platformDefinitions.map(item=>item.meaning).join(" ");
    expect(text).toMatch(/merged planned pull requests/i);
    expect(text).toMatch(/unknown/i);
    expect(text).toMatch(/currenc(?:y|ies)/i);
  });
});
