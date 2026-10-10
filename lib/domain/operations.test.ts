import { describe, expect, it } from "vitest";
import { assessProjectOperations, validateOperationSample, type OperationSample } from "./operations";

const now = new Date("2026-10-08T00:00:00Z");
const sample = (metric: OperationSample["metric"], value: number): OperationSample => ({ projectId: "p", environment: "production", metric, value, source: "monitor", externalId: metric, observedAt: "2026-10-07T23:59:00Z" });
const samples = [sample("availability-percent", 100), sample("error-rate-percent", 0), sample("latency-p95-ms", 80)];

describe("operational measurements", () => {
  it("requires all core current signals for nominal status while preserving zero error rates", () => {
    expect(assessProjectOperations("p", "production", samples, now).health).toBe("nominal");
    expect(assessProjectOperations("p", "production", samples.slice(0, 1), now).health).toBe("unknown");
    expect(assessProjectOperations("p", "production", samples, now).readings["error-rate-percent"].value).toBe(0);
  });
  it("marks threshold failures degraded and does not reuse stale, future, or other-environment measurements", () => {
    expect(assessProjectOperations("p", "production", [sample("availability-percent", 50)], now).health).toBe("degraded");
    expect(assessProjectOperations("p", "staging", samples, now).health).toBe("unknown");
    expect(assessProjectOperations("p", "production", samples, new Date("2026-10-08T02:00:00Z")).readings["availability-percent"].freshness).toBe("stale");
    expect(assessProjectOperations("p", "production", samples, new Date("2026-10-07T22:00:00Z")).health).toBe("unknown");
  });
  it("rejects impossible percentages and nonfinite values before persistence", () => {
    expect(() => validateOperationSample(sample("cpu-percent", 101))).toThrow("Percent metrics");
    expect(() => validateOperationSample(sample("worker-heartbeat-percent", 110))).toThrow("Percent metrics");
    expect(() => validateOperationSample(sample("latency-p95-ms", Infinity))).toThrow("Invalid operational");
  });
  it("displays worker presence without treating it as website availability", () => {
    const workerOnly = [sample("worker-heartbeat-percent", 100)];
    const assessment = assessProjectOperations("p", "production", workerOnly, now);
    expect(assessment.readings["worker-heartbeat-percent"].value).toBe(100);
    expect(assessment.readings["availability-percent"].freshness).toBe("unknown");
    expect(assessment.health).toBe("unknown");
  });
});
