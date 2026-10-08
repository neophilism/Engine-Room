create type github_pull_request_state as enum ('open', 'closed');

create table github_pull_requests (
  id bigserial primary key,
  github_pull_request_id bigint not null unique,
  repository_id uuid not null references repositories(id) on delete cascade,
  number integer not null,
  title text not null,
  state github_pull_request_state not null,
  draft boolean not null default false,
  html_url text not null,
  author_login text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  closed_at timestamptz,
  merged_at timestamptz,
  last_synced_at timestamptz not null default now(),
  unique (repository_id, number),
  check (number > 0),
  check (title <> ''),
  check (html_url <> '')
);

create index github_pull_requests_by_repository_updated
  on github_pull_requests(repository_id, updated_at desc);

create index github_pull_requests_by_state
  on github_pull_requests(repository_id, state);

comment on table github_pull_requests is
  'Normalized GitHub pull request state used by roadmap synchronization and activity views.';
