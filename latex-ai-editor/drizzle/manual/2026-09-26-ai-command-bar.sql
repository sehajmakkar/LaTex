-- Phase 5: AI command bar. Additive only; safe to run more than once.
-- (The DB is managed with drizzle-kit push today; fold this into the Phase 2 baseline migration.)

ALTER TABLE user_usage ADD COLUMN IF NOT EXISTS ai_commands integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  edits text,
  status text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_messages_project_created_idx ON ai_messages (project_id, created_at);

CREATE TABLE IF NOT EXISTS project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  label text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_versions_project_created_idx ON project_versions (project_id, created_at);
