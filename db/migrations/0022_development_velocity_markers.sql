-- Versioned operator-controlled comparison marker.
-- Date means "Boardroom began affecting the development workflow",
-- not when the Boardroom repository was first created.
CREATE TABLE development_velocity_markers (
  key text PRIMARY KEY CHECK (key = 'boardroom-rollout'),
  effective_date date NOT NULL,
  recorded_by text NOT NULL CHECK (length(recorded_by) BETWEEN 1 AND 256),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE development_velocity_marker_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  marker_key text NOT NULL CHECK (marker_key = 'boardroom-rollout'),
  previous_date date,
  new_date date,
  changed_by text NOT NULL CHECK (length(changed_by) BETWEEN 1 AND 256),
  changed_at timestamptz NOT NULL DEFAULT now()
);
