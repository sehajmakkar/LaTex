import { defineConfig } from "drizzle-kit";

// `npm run db:*` from a plain terminal: read DATABASE_URL from .env if it isn't set.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env");
  } catch {
    /* no .env: fall back to the local default below */
  }
}

/**
 * Migrations live in ./drizzle (0000_baseline and after). Workflow:
 *   edit src/lib/db/schema.ts → npm run db:generate → review the SQL → npm run db:migrate
 * Don't use `db:push` on a shared or production database: it changes the schema
 * without a migration file. Old history is in drizzle/_archive (not applied).
 */
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://latex:latex@127.0.0.1:5432/latex_ai_editor",
  },
});
