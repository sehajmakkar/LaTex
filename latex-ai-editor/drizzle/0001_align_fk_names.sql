-- Databases set up before the migration baseline (27 Sep 2026) got four foreign keys from hand-written SQL,
-- with Postgres' default names (…_fkey). Rename them to the names the baseline uses, so future migrations
-- find them. Only renames when the old name exists: on a database built from the baseline this does nothing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_messages_project_id_fkey') THEN
    ALTER TABLE "ai_messages" RENAME CONSTRAINT "ai_messages_project_id_fkey" TO "ai_messages_project_id_projects_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_messages_user_id_fkey') THEN
    ALTER TABLE "ai_messages" RENAME CONSTRAINT "ai_messages_user_id_fkey" TO "ai_messages_user_id_users_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_versions_project_id_fkey') THEN
    ALTER TABLE "project_versions" RENAME CONSTRAINT "project_versions_project_id_fkey" TO "project_versions_project_id_projects_id_fk";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_versions_user_id_fkey') THEN
    ALTER TABLE "project_versions" RENAME CONSTRAINT "project_versions_user_id_fkey" TO "project_versions_user_id_users_id_fk";
  END IF;
END $$;
