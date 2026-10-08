alter table project_releases add column source text not null default 'internal';
alter table project_releases add column last_event_at timestamptz;
update project_releases r set last_event_at = (select max(occurred_at) from project_release_events e where e.release_id = r.id);
alter table project_releases drop constraint project_releases_project_id_environment_release_key_key;
alter table project_releases add unique (project_id, environment, source, release_key);

create table telemetry_deliveries (
  project_id uuid not null references projects(id) on delete cascade,
  environment text not null,
  source text not null,
  delivery_id text not null,
  key_id text not null,
  adapter text not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  record_count integer not null check (record_count between 1 and 100),
  received_at timestamptz not null default now(),
  primary key (project_id, environment, source, delivery_id)
);
create index telemetry_deliveries_by_source on telemetry_deliveries(project_id, environment, source, received_at desc);
