-- Per-project compiler setting and the engine that last compiled cleanly. Additive; safe to run more than once.
-- (The DB is managed with drizzle-kit push today; fold this into the Phase 2 baseline migration.)

ALTER TABLE projects ADD COLUMN IF NOT EXISTS compiler text NOT NULL DEFAULT 'auto';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_engine text;
