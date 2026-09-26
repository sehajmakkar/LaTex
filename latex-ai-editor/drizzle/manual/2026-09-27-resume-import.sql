-- Resume import: monthly counter for AI imports (PDF/DOCX/text). Additive; safe to run more than once.
-- (The DB is managed with drizzle-kit push today; fold this into the Phase 2 baseline migration.)

ALTER TABLE user_usage ADD COLUMN IF NOT EXISTS ai_imports integer NOT NULL DEFAULT 0;
