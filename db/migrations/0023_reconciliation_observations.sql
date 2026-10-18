-- Extend the existing reconciliation state; retain the last complete publication
-- across a partial/failed run. No credentials or PR bodies are stored here.
ALTER TABLE engine_room_reconciliation_runs
 ADD COLUMN observation_id uuid,
 ADD COLUMN coverage jsonb NOT NULL DEFAULT '{}'::jsonb,
 ADD COLUMN published_snapshot jsonb,
 ADD COLUMN published_at timestamptz;
ALTER TABLE engine_room_live_state
 ADD COLUMN discovery_scope text,
 ADD COLUMN discovery_error text;
