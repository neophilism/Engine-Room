import { describe, expect, it } from "vitest";
import { featureStatus, validateFeatureDefinitions } from "./project-features";

describe("structured feature delivery", () => {
  it("requires all linked work to merge and does not treat no links as implementation", () => {
    expect(featureStatus(3, 3, 0)).toBe("implemented");
    expect(featureStatus(3, 1, 0)).toBe("underway");
    expect(featureStatus(3, 0, 1)).toBe("underway");
    expect(featureStatus(3, 0, 0)).toBe("remaining");
    expect(featureStatus(0, 0, 0)).toBe("remaining");
  });
  it("rejects duplicate feature keys, duplicate work links, and invalid ordinals", () => {
    const definition = { key: "feature", title: "Feature", plannedPrOrdinals: [1, 2] };
    expect(() => validateFeatureDefinitions([definition])).not.toThrow();
    expect(() => validateFeatureDefinitions([definition, definition])).toThrow("Feature keys");
    expect(() => validateFeatureDefinitions([{ ...definition, plannedPrOrdinals: [1, 1] }])).toThrow("ordinals");
    expect(() => validateFeatureDefinitions([{ ...definition, plannedPrOrdinals: [0] }])).toThrow("ordinals");
  });
});
