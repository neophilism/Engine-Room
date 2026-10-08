create table project_risks (
  project_id uuid not null references projects(id) on delete cascade,
  risk_key text not null,
  title text not null check (length(trim(title)) > 0),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  blocking boolean not null default false,
  state text not null check (state in ('open', 'resolved')),
  updated_at timestamptz not null default now(),
  primary key (project_id, risk_key)
);
create table project_release_targets (
  project_id uuid primary key references projects(id) on delete cascade,
  commit_sha text not null check (commit_sha ~ '^[a-f0-9]{40}$'),
  environment text not null check (environment ~ '^[a-z0-9-]{1,64}$'),
  updated_at timestamptz not null default now()
);
create table project_release_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  commit_sha text not null check (commit_sha ~ '^[a-f0-9]{40}$'),
  environment text not null check (environment ~ '^[a-z0-9-]{1,64}$'),
  gate text not null check (gate in ('tests', 'build', 'responsive', 'accessibility', 'performance', 'security', 'deployment', 'observability', 'backup-restore')),
  status text not null check (status in ('passed', 'failed')),
  evidence_url text not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  check (expires_at > observed_at)
);
create index project_release_evidence_by_target on project_release_evidence(project_id, commit_sha, environment, gate, observed_at desc);
