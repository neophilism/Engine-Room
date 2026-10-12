ALTER TABLE repositories ADD COLUMN github_description text;
ALTER TABLE repositories ADD COLUMN github_homepage text;
ALTER TABLE repositories ADD COLUMN github_topics jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE repositories ADD COLUMN github_created_at timestamptz;
ALTER TABLE repositories ADD COLUMN github_updated_at timestamptz;
ALTER TABLE repositories ADD COLUMN github_pushed_at timestamptz;
ALTER TABLE repositories ADD COLUMN metadata_synced_at timestamptz;

CREATE TABLE repository_latest_activity (
  repository_id uuid PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('pr-opened','pr-merged','pr-closed','pr-updated','pr-pushed','direct-commit','repository-push')),
  occurred_at timestamptz NOT NULL,
  title text NOT NULL,
  html_url text NOT NULL,
  source_ref text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE repository_latest_activity IS 'Latest GitHub development event; occurred_at is source activity time, never the dashboard refresh time.';

CREATE TABLE repository_about_seed (
  repository_full_name text PRIMARY KEY,
  requested_description text NOT NULL,
  state text NOT NULL CHECK(state IN ('pending','applied','preserved','failed','excluded')),
  last_attempt_at timestamptz,
  applied_at timestamptz,
  error_code integer
);
