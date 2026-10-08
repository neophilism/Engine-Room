import { describe, expect, it } from "vitest";
import { normalizePublicGitHubObservation } from "./public-github-status";

describe("public GitHub source freshness", () => {
  it("normalizes actual counts and a provider observation timestamp", () => {
    const result=normalizePublicGitHubObservation({repo_count:"12",pr_count:"74",merged_count:"60",latest_observation:new Date("2026-10-08T13:00:00Z")});
    expect(result).toMatchObject({source:"database",repositoryCount:12,pullRequestCount:74,mergedPullRequestCount:60,mostRecentObservation:"2026-10-08T13:00:00.000Z"});
  });
  it("does not invent a sync timestamp for an empty observation set", () => {
    const result=normalizePublicGitHubObservation({repo_count:"0",pr_count:"0",merged_count:"0",latest_observation:null});
    expect(result).toMatchObject({repositoryCount:0,mostRecentObservation:null});
  });
  it("rejects nonsensical counts", () => {
    expect(()=>normalizePublicGitHubObservation({repo_count:"1",pr_count:"3",merged_count:"4",latest_observation:null})).toThrow();
    expect(()=>normalizePublicGitHubObservation({repo_count:"oops",pr_count:"3",merged_count:"1",latest_observation:null})).toThrow();
  });
});
