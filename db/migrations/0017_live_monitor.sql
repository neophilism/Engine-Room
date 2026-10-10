ALTER TABLE github_pull_requests
  ADD COLUMN head_sha text,
  ADD COLUMN base_ref text,
  ADD COLUMN merge_commit_sha text,
  ADD COLUMN release_included boolean,
  ADD COLUMN release_checked_at timestamptz,
  ADD COLUMN release_target_sha text,
  ADD COLUMN mergeable boolean,
  ADD COLUMN checks_state text NOT NULL DEFAULT 'unknown',
  ADD COLUMN checks_observed_at timestamptz,
  ADD COLUMN checks_url text,
  ADD COLUMN review_summary text;

CREATE TABLE github_check_runs (
  repository_id uuid NOT NULL REFERENCES repositories(id),
  external_id text NOT NULL,
  head_sha text NOT NULL,
  name text NOT NULL,
  status text NOT NULL,
  conclusion text,
  html_url text NOT NULL,
  observed_at timestamptz NOT NULL,
  PRIMARY KEY(repository_id, external_id)
);
CREATE INDEX github_checks_by_head ON github_check_runs(repository_id, head_sha);

ALTER TABLE github_webhook_deliveries
  ADD COLUMN attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE github_repository_sync (
  repository_id uuid PRIMARY KEY REFERENCES repositories(id),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  default_branch_sha text
);
CREATE TABLE github_sync_http_cache (
  path text PRIMARY KEY,
  etag text,
  payload jsonb NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE engine_room_live_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  revision bigint NOT NULL DEFAULT 1,
  changed_at timestamptz NOT NULL DEFAULT now(),
  last_worker_at timestamptz,
  last_error text,
  rate_limit_reset_at timestamptz,
  discovery_at timestamptz
);
INSERT INTO engine_room_live_state(singleton) VALUES(true);
-- Enable the requested built-in reconciliation for installations with untouched default controls.
UPDATE engine_room_control_settings SET github_reconciliation_enabled=true,github_reconciliation_interval_minutes=15
WHERE revision=0 AND NOT EXISTS(SELECT 1 FROM engine_room_control_audit);

CREATE TABLE project_plan_documents (
  version_id bigint GENERATED ALWAYS AS IDENTITY,
  repository_id uuid NOT NULL REFERENCES repositories(id),
  path text NOT NULL,
  fingerprint text NOT NULL,
  source_url text NOT NULL,
  source_ref text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(repository_id,path,fingerprint)
);
CREATE TABLE project_plan_items (
  repository_id uuid NOT NULL REFERENCES repositories(id),
  path text NOT NULL,
  fingerprint text NOT NULL,
  ordinal integer NOT NULL CHECK(ordinal>0),
  title text NOT NULL,
  github_pr_number integer,
  github_pr_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
  mapping_reason text,
  scope text NOT NULL CHECK(scope IN ('original','addition')),
  PRIMARY KEY(repository_id,path,fingerprint,ordinal),
  FOREIGN KEY(repository_id,path,fingerprint) REFERENCES project_plan_documents(repository_id,path,fingerprint)
);
CREATE INDEX project_plan_document_history ON project_plan_documents(repository_id,path,version_id DESC);
