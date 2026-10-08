create table github_development_activity (
  repository_id uuid not null references repositories(id) on delete cascade,
  kind text not null check (kind in ('commit', 'issue', 'review', 'workflow')),
  external_id text not null check (length(external_id) > 0),
  title text not null,
  html_url text not null,
  occurred_at timestamptz not null,
  actor_login text,
  state text,
  conclusion text,
  last_synced_at timestamptz not null default now(),
  primary key (repository_id, kind, external_id)
);
create index github_activity_by_repository_time on github_development_activity(repository_id, occurred_at desc);
