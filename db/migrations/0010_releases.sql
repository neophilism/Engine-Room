create table project_releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  release_key text not null,
  commit_sha text not null check (commit_sha ~ '^[a-f0-9]{40}$'),
  environment text not null check (environment ~ '^[a-z0-9-]{1,64}$'),
  state text not null default 'draft' check (state in ('draft', 'building', 'validating', 'awaiting-approval', 'approved', 'deploying', 'live', 'failed', 'rolled-back', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, environment, release_key)
);
create table project_release_events (
  release_id uuid not null references project_releases(id) on delete cascade,
  event_key text not null,
  from_state text not null,
  to_state text not null,
  actor text not null,
  occurred_at timestamptz not null,
  evidence_url text,
  primary key (release_id, event_key)
);
create index project_releases_by_time on project_releases(updated_at desc);
