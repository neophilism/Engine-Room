export const operationMetrics = ["availability-percent", "latency-p95-ms", "requests-per-minute", "error-rate-percent", "cpu-percent", "memory-percent"] as const;
export type OperationMetric = typeof operationMetrics[number];
export type OperationSample = { projectId: string; environment: string; metric: OperationMetric; value: number; source: string; externalId: string; observedAt: string };
export type OperationsProject = { id: string; slug: string; displayName: string };
export type OperationsOverview = { source: "database" | "unconfigured" | "error"; projects: OperationsProject[]; samples: OperationSample[] };
export type MetricReading = { value?: number; freshness: "fresh" | "stale" | "unknown"; observedAt?: string; source?: string };
export const DEFAULT_OPERATIONS_THRESHOLDS = { availability: 99.9, errorRate: 1, latency: 1000, staleAfterMs: 15 * 60_000 };

export function validateOperationSample(sample: OperationSample) {
  if (!operationMetrics.includes(sample.metric) || !Number.isFinite(sample.value) || sample.value < 0) throw new Error("Invalid operational metric or value.");
  if (sample.metric.endsWith("percent") && sample.value > 100) throw new Error("Percent metrics must be between zero and 100.");
  if (!/^[a-z0-9-]{1,64}$/.test(sample.environment) || !sample.source.trim() || !sample.externalId.trim()) throw new Error("Operational samples require environment and source identity.");
  const time = new Date(sample.observedAt).getTime();
  if (!Number.isFinite(time) || time > Date.now() + 300_000) throw new Error("Invalid operational observation timestamp.");
}

export function assessProjectOperations(projectId: string, environment: string, samples: readonly OperationSample[], now = new Date(), thresholds = DEFAULT_OPERATIONS_THRESHOLDS) {
  const readings = Object.fromEntries(operationMetrics.map((metric) => {
    const sample = samples.filter((sample) => sample.projectId === projectId && sample.environment === environment && sample.metric === metric)
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
    const age = sample ? now.getTime() - new Date(sample.observedAt).getTime() : NaN;
    const freshness = Number.isFinite(age) && age >= 0 ? age <= thresholds.staleAfterMs ? "fresh" : "stale" : "unknown";
    return [metric, { value: freshness === "fresh" ? sample?.value : undefined, freshness, observedAt: sample?.observedAt, source: sample?.source }];
  })) as Record<OperationMetric, MetricReading>;
  const availability = readings["availability-percent"], errors = readings["error-rate-percent"], latency = readings["latency-p95-ms"];
  const degraded = (availability.value !== undefined && availability.value < thresholds.availability) || (errors.value !== undefined && errors.value > thresholds.errorRate) || (latency.value !== undefined && latency.value > thresholds.latency);
  return { health: degraded ? "degraded" : availability.value !== undefined && errors.value !== undefined && latency.value !== undefined ? "nominal" : "unknown", readings } as const;
}
