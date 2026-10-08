create table project_incidents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  environment text not null check (environment ~ '^[a-z0-9-]{1,64}$'),
  source text not null,
  external_id text not null,
  title text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  state text not null default 'detected' check (state in ('detected', 'acknowledged', 'investigating', 'mitigated', 'resolved')),
  opened_at timestamptz not null,
  last_event_at timestamptz not null,
  resolved_at timestamptz,
  evidence_url text,
  updated_at timestamptz not null default now(),
  unique (project_id, environment, source, external_id)
);
create table project_incident_events (
  sequence bigserial unique not null,
  incident_id uuid not null references project_incidents(id) on delete cascade,
  event_key text not null,
  from_state text not null,
  to_state text not null,
  actor text not null,
  note text not null,
  occurred_at timestamptz not null,
  evidence_url text,
  primary key (incident_id, event_key)
);
create index project_incidents_by_state on project_incidents(state, updated_at desc);
