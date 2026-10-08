CREATE TABLE engine_room_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) BETWEEN 5 AND 254),
 display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
 password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('admin','viewer')),
 disabled boolean NOT NULL DEFAULT false,
 failed_attempts integer NOT NULL DEFAULT 0,
 locked_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE engine_room_auth_sessions (
 token_hash text PRIMARY KEY CHECK (length(token_hash)=64),
 user_id uuid NOT NULL REFERENCES engine_room_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX engine_room_sessions_expiry ON engine_room_auth_sessions(expires_at);
CREATE INDEX engine_room_sessions_user ON engine_room_auth_sessions(user_id);
CREATE TABLE engine_room_invitations (
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
 email text NOT NULL CHECK(email=lower(email)),
 role text NOT NULL CHECK(role IN ('admin','viewer')),
 invited_by uuid NOT NULL REFERENCES engine_room_users(id),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
