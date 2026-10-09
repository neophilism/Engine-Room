import { describe, expect, it } from "vitest";
import { asLatestRenderDeployment, verifiedRenderServices } from "./render-deployments";
describe("Render deployment observations", () => {
  it("contains verified real, distinct Render service identities", () => {
    expect(verifiedRenderServices.length).toBeGreaterThanOrEqual(16);
    expect(new Set(verifiedRenderServices.map(service=>service.id)).size).toBe(verifiedRenderServices.length);
    expect(verifiedRenderServices.filter(service=>service.deployStatus === "live").length).toBeGreaterThanOrEqual(14);
    for (const service of verifiedRenderServices) {
      expect(service.website).toMatch(/^https:\/\/[a-z0-9-]+\.onrender\.com$/);
      expect(service.repository).toMatch(/^neophilism\//);
    }
  });
  it("accepts a provider deployment record without making a health claim", () => {
    expect(asLatestRenderDeployment([{deploy:{status:"live",updatedAt:"2026-10-08T07:04:00Z",commit:{id:"a".repeat(40)}}}]))
      .toEqual({status:"live",updatedAt:"2026-10-08T07:04:00Z",commitSha:"a".repeat(40)});
    expect(asLatestRenderDeployment([{deploy:{status:"verified",updatedAt:"2026-10-08T07:04:00Z"}}])).toBeNull();
    expect(asLatestRenderDeployment([])).toBeNull();
  });
});
