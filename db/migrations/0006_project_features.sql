create unique index planned_pr_id_and_plan on planned_pull_requests(id, development_plan_id);
create table project_features (
  id uuid primary key default gen_random_uuid(),
  development_plan_id uuid not null references development_plans(id) on delete cascade,
  feature_key text not null,
  title text not null,
  description text,
  ordinal integer not null check (ordinal > 0),
  unique (development_plan_id, feature_key),
  unique (id, development_plan_id),
  check (feature_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check (length(feature_key) <= 64),
  check (length(trim(title)) > 0 and length(title) <= 240),
  check (description is null or length(description) <= 2000)
);
create table feature_planned_pull_requests (
  feature_id uuid not null,
  development_plan_id uuid not null,
  planned_pull_request_id uuid not null,
  primary key (feature_id, planned_pull_request_id),
  foreign key (feature_id, development_plan_id) references project_features(id, development_plan_id) on delete cascade,
  foreign key (planned_pull_request_id, development_plan_id) references planned_pull_requests(id, development_plan_id) on delete cascade
);
create index project_features_by_plan on project_features(development_plan_id, ordinal);
