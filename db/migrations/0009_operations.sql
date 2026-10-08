create table project_operation_samples (
  project_id uuid not null references projects(id) on delete cascade,
  environment text not null check (environment ~ '^[a-z0-9-]{1,64}$'),
  metric text not null check (metric in ('availability-percent', 'latency-p95-ms', 'requests-per-minute', 'error-rate-percent', 'cpu-percent', 'memory-percent')),
  value double precision not null check (value >= 0 and value < 'Infinity'::double precision),
  source text not null check (length(trim(source)) > 0),
  external_id text not null check (length(trim(external_id)) > 0),
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  primary key (project_id, environment, metric, source, external_id),
  check (metric not like '%percent' or value <= 100)
);
create index project_operation_samples_by_time on project_operation_samples(project_id, environment, metric, observed_at desc);
