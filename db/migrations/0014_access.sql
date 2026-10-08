create table project_access_observations (
  project_id uuid not null references projects(id) on delete cascade,
  environment text not null,
  source text not null,
  external_id text not null,
  principal_id text not null,
  display_name text not null,
  principal_kind text not null check (principal_kind in ('person', 'service')),
  status text not null check (status in ('active', 'invited', 'suspended', 'deleted')),
  roles text[] not null,
  privileged boolean not null,
  mfa_enabled boolean,
  last_active_at timestamptz,
  organization_id text,
  organization_name text,
  credential_expires_at timestamptz,
  observed_at timestamptz not null,
  payload_hash text not null,
  received_at timestamptz not null default now(),
  primary key (project_id, environment, source, external_id),
  check ((organization_id is null) = (organization_name is null)),
  check (last_active_at is null or last_active_at <= observed_at)
);
create index access_observations_by_principal on project_access_observations(project_id, environment, source, principal_id, observed_at desc, received_at desc);
