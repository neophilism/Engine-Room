-- Keep worker-process presence distinct from HTTP request availability.
-- Migrations are additive and preserve existing data and sources.
ALTER TABLE project_operation_samples
  DROP CONSTRAINT IF EXISTS project_operation_samples_metric_check;

ALTER TABLE project_operation_samples
  ADD CONSTRAINT project_operation_samples_metric_check
  CHECK (metric IN (
    'availability-percent',
    'latency-p95-ms',
    'requests-per-minute',
    'error-rate-percent',
    'cpu-percent',
    'memory-percent',
    'worker-heartbeat-percent'
  ));
