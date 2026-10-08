import { describe, expect, it } from "vitest";
import { incidentPipeline, validateIncidentEvent, validateIncidentSignal } from "./incidents";

describe("incident response", () => {
  it("requires response notes and valid transitions while permitting explicit reopening", () => {
    const event = { key: "response-1", from: "investigating" as const, to: "resolved" as const, actor: "on-call", occurredAt: new Date().toISOString(), note: "Recovered after restart" };
    expect(() => validateIncidentEvent(event)).not.toThrow();
    expect(() => validateIncidentEvent({ ...event, note: " " })).toThrow();
    expect(() => validateIncidentEvent({ ...event, from: "resolved", to: "mitigated" })).toThrow();
    expect(() => validateIncidentEvent({ ...event, from: "resolved", to: "detected" })).not.toThrow();
    expect(incidentPipeline("resolved").every((stage) => stage.state === "complete")).toBe(true);
  });
  it("rejects future alerts and unsafe evidence without inventing response completion", () => {
    const signal = { projectId: "project", environment: "production", source: "monitor", externalId: "alert-1", title: "API unavailable", severity: "critical" as const, occurredAt: new Date().toISOString() };
    expect(() => validateIncidentSignal(signal)).not.toThrow();
    expect(() => validateIncidentSignal({ ...signal, occurredAt: new Date(Date.now() + 600_000).toISOString() })).toThrow();
    expect(() => validateIncidentSignal({ ...signal, evidenceUrl: "https://user:secret@example.org" })).toThrow();
    expect(incidentPipeline("detected").map((stage) => stage.state)).toEqual(["active", "neutral", "neutral", "neutral"]);
  });
});
