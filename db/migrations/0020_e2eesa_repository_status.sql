CREATE TABLE repository_security_status (
 repository_id uuid PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
 state text NOT NULL CHECK(state IN ('valid','missing','invalid','unavailable','excluded')),
 status_json jsonb, source_commit text, source_fingerprint text, source_url text,
 last_attempt_at timestamptz NOT NULL DEFAULT now(), last_success_at timestamptz, last_error text
);
COMMENT ON TABLE repository_security_status IS 'Repository-reported implementation, testing and independent expert review with source bindings; production certification remains separate.';
