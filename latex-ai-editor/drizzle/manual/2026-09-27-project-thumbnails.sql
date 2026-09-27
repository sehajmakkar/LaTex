-- Dashboard thumbnails: when each project's first-page image was last rendered. Additive; safe to run more than once.
-- (The DB is managed with drizzle-kit push today; fold this into the Phase 2 baseline migration.)

ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_updated_at timestamp;
