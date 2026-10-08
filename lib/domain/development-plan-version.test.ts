import { describe, expect, it } from "vitest";
import { fingerprintApprovedManifest, nextApprovedPlanVersion } from "./development-plan-version";
import type { ProjectManifest } from "../manifest/project-manifest";

function manifest(plannedPrs = 40): ProjectManifest {
  return {
    project: {
      name: "Engine-Room",
      displayName: "Engine Room",
      repository: "neophilism/Engine-Room",
      status: "active-development"
    },
    roadmap: {
      version: 1,
      plannedPrs,
      approved: true
    },
    milestones: [{ name: "All work", prs: plannedPrs }]
  };
}

describe("approved development-plan versioning", () => {
  it("fingerprints equivalent approved manifests deterministically", () => {
    expect(fingerprintApprovedManifest(manifest())).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprintApprovedManifest(manifest())).toBe(fingerprintApprovedManifest(manifest()));
  });

  it("does not create a new version when the approved manifest is unchanged", () => {
    const current = manifest();
    const fingerprint = fingerprintApprovedManifest(current);

    expect(
      nextApprovedPlanVersion(
        [{ version: 3, fingerprint, approvedAt: "2026-10-07T00:00:00Z" }],
        current
      )
    ).toEqual({ version: 3, fingerprint, unchanged: true });
  });

  it("increments from the highest historical version after a material change", () => {
    const old = manifest(39);
    expect(
      nextApprovedPlanVersion(
        [
          { version: 1, fingerprint: fingerprintApprovedManifest(old), approvedAt: "2026-10-01T00:00:00Z" },
          { version: 4, fingerprint: "different", approvedAt: "2026-10-02T00:00:00Z" }
        ],
        manifest(40)
      ).version
    ).toBe(5);
  });

  it("rejects unapproved manifests", () => {
    const draft = manifest();
    draft.roadmap.approved = false;
    expect(() => nextApprovedPlanVersion([], draft)).toThrow("Only approved manifests");
  });
});
