import { describe, expect, it } from "vitest";
import { releasePipeline, validateReleaseEvent } from "./releases";

describe("release pipeline", () => {
  it("rejects skipping approval and requires evidence for live/approval/rollback", () => {
    const event = { key: "event", actor: "operator", occurredAt: new Date().toISOString(), from: "draft" as const, to: "live" as const };
    expect(() => validateReleaseEvent(event)).toThrow("Invalid release transition");
    expect(() => validateReleaseEvent({ ...event, from: "deploying" })).toThrow("require evidence");
    expect(() => validateReleaseEvent({ ...event, from: "deploying", evidenceUrl: "https://example.org/deploy" })).not.toThrow();
    expect(() => validateReleaseEvent({ ...event, from: "live", to: "rolled-back" })).toThrow("require evidence");
  });
  it("distinguishes production from rollout and failure from completion", () => {
    expect(releasePipeline("deploying").map((stage) => stage.state)).toEqual(["complete", "complete", "active", "neutral"]);
    expect(releasePipeline("live").every((stage) => stage.state === "complete")).toBe(true);
    expect(releasePipeline("live", "staging")[3].label).toBe("Live environment");
    expect(releasePipeline("failed").every((stage) => stage.state === "blocked")).toBe(true);
  });
});
