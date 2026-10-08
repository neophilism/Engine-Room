import { describe, expect, it } from "vitest";
import type { DiscoveredRepository } from "../github/types";
import type { ProjectManifest } from "../manifest/project-manifest";
import {
  prepareProjectRegistration,
  projectSlug
} from "./project-registration";

const repository: DiscoveredRepository = {
  githubRepositoryId: 42,
  ownerLogin: "neophilism",
  name: "Engine-Room",
  fullName: "neophilism/Engine-Room",
  htmlUrl: "https://github.com/neophilism/Engine-Room",
  defaultBranch: "main",
  visibility: "public",
  archived: false
};

function manifest(): ProjectManifest {
  return {
    project: {
      name: "Engine-Room",
      displayName: "Engine Room",
      repository: "neophilism/Engine-Room",
      status: "active-development"
    },
    roadmap: {
      version: 1,
      plannedPrs: 5,
      approved: true
    },
    milestones: [
      { name: "Foundation", prs: 2 },
      { name: "GitHub engine", prs: 3 }
    ]
  };
}

describe("automatic project registration", () => {
  it("normalizes project names into stable slugs", () => {
    expect(projectSlug(" Engine Room / Control ")).toBe("engine-room-control");
  });

  it("seeds the exact approved PR count across milestone ordinals", () => {
    expect(prepareProjectRegistration(manifest(), repository)).toEqual({
      slug: "engine-room",
      status: "active-development",
      plannedPullRequests: [
        { ordinal: 1, milestoneOrdinal: 1, title: "Roadmap PR 1" },
        { ordinal: 2, milestoneOrdinal: 1, title: "Roadmap PR 2" },
        { ordinal: 3, milestoneOrdinal: 2, title: "Roadmap PR 3" },
        { ordinal: 4, milestoneOrdinal: 2, title: "Roadmap PR 4" },
        { ordinal: 5, milestoneOrdinal: 2, title: "Roadmap PR 5" }
      ]
    });
  });

  it("never registers a discovered repository under a different manifest identity", () => {
    expect(() =>
      prepareProjectRegistration(manifest(), {
        ...repository,
        fullName: "neophilism/Another-Repo"
      })
    ).toThrow("does not match discovered repository");
  });

  it("rejects unapproved plans and unsupported lifecycle states", () => {
    const draft = manifest();
    draft.roadmap.approved = false;
    expect(() => prepareProjectRegistration(draft, repository)).toThrow(
      "Only approved manifests"
    );

    const unsupported = manifest();
    unsupported.project.status = "mystery";
    expect(() => prepareProjectRegistration(unsupported, repository)).toThrow(
      "Unsupported project status"
    );
  });
});
