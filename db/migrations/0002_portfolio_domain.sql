create type repository_visibility as enum ('public', 'private', 'internal');
create type project_status as enum (
  'planned',
  'active-development',
  'beta',
  'live',
  'maintenance',
  'complete',
  'paused',
  'archived'
);
create type development_plan_status as enum ('draft', 'approved', 'superseded', 'retired');
create type milestone_status as enum ('planned', 'active', 'complete', 'blocked');
create type planned_pull_request_status as enum ('planned', 'in-progress', 'merged', 'skipped');
create type project_repository_relationship as enum ('primary', 'supporting');

create table repositories (
  id uuid primary key,
  github_repository_id bigint not null unique,
  owner_login text not null,
  name text not null,
  full_name text not null unique,
  html_url text not null,
  default_branch text not null default 'main',
  visibility repository_visibility not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_login <> ''),
  check (name <> ''),
  check (full_name <> ''),
  check (html_url <> '')
);

create table projects (
  id uuid primary key,
  slug text not null unique,
  display_name text not null,
  summary text,
  status project_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check (display_name <> '')
);

create table project_repositories (
  project_id uuid not null references projects(id) on delete cascade,
  repository_id uuid not null references repositories(id) on delete cascade,
  relationship project_repository_relationship not null default 'supporting',
  created_at timestamptz not null default now(),
  primary key (project_id, repository_id)
);

create unique index one_primary_repository_per_project
  on project_repositories(project_id)
  where relationship = 'primary';

create table development_plans (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  version integer not null,
  status development_plan_status not null default 'draft',
  title text not null,
  summary text,
  planned_pr_total integer not null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, version),
  check (version > 0),
  check (planned_pr_total > 0),
  check (title <> ''),
  check ((status = 'approved' and approved_at is not null) or status <> 'approved')
);

create table milestones (
  id uuid primary key,
  development_plan_id uuid not null references development_plans(id) on delete cascade,
  ordinal integer not null,
  name text not null,
  description text,
  planned_pr_total integer not null,
  status milestone_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (development_plan_id, ordinal),
  unique (id, development_plan_id),
  check (ordinal > 0),
  check (planned_pr_total >= 0),
  check (name <> '')
);

create table planned_pull_requests (
  id uuid primary key,
  development_plan_id uuid not null references development_plans(id) on delete cascade,
  milestone_id uuid,
  repository_id uuid references repositories(id) on delete restrict,
  ordinal integer not null,
  title text not null,
  description text,
  status planned_pull_request_status not null default 'planned',
  github_pr_number integer,
  merged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (development_plan_id, ordinal),
  foreign key (milestone_id, development_plan_id)
    references milestones(id, development_plan_id)
    on delete restrict,
  check (ordinal > 0),
  check (title <> ''),
  check (github_pr_number is null or github_pr_number > 0),
  check ((status = 'merged' and merged_at is not null) or status <> 'merged')
);

create unique index one_planned_record_per_github_pr
  on planned_pull_requests(repository_id, github_pr_number)
  where repository_id is not null and github_pr_number is not null;

create index development_plans_by_project
  on development_plans(project_id, version desc);

create index milestones_by_plan
  on milestones(development_plan_id, ordinal);

create index planned_pull_requests_by_plan
  on planned_pull_requests(development_plan_id, ordinal);

create index planned_pull_requests_by_status
  on planned_pull_requests(development_plan_id, status);

comment on table repositories is
  'Git repositories connected to Engine Room. GitHub is the initial provider.';

comment on table projects is
  'Portfolio projects tracked across development and operations.';

comment on table project_repositories is
  'Allows a project to use one primary repository and optional supporting repositories.';

comment on table development_plans is
  'Version-addressable development plans whose approved planned PR total defines roadmap progress.';

comment on table milestones is
  'Ordered development-plan stages used for roadmap grouping and machine indicator lamps.';

comment on table planned_pull_requests is
  'Approved roadmap units. Only rows in merged status count toward the main roadmap numerator.';
