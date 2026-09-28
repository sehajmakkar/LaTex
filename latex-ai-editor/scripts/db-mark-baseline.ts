/**
 * For a database created BEFORE the migration baseline (with `drizzle-kit push`
 * and hand-written SQL): records 0000_baseline as already applied, so
 * `npm run db:migrate` runs only the migrations after it. The database must
 * already have the baseline's tables (check with --check first).
 *
 *   npx tsx --env-file=.env scripts/db-mark-baseline.ts --check   # report only
 *   npx tsx --env-file=.env scripts/db-mark-baseline.ts           # record it
 *
 * Never run this on an empty database: use `npm run db:migrate` there.
 */
import postgres from "postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";

const EXPECTED_TABLES = ["ai_messages", "ats_reports", "compilations", "processed_webhooks", "project_versions", "projects", "user_usage", "users"];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const checkOnly = process.argv.includes("--check");
  const [baseline] = readMigrationFiles({ migrationsFolder: "./drizzle" });
  if (!baseline) throw new Error("No migrations found in ./drizzle");

  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const tables = (await sql<{ table_name: string }[]>`select table_name from information_schema.tables where table_schema = 'public'`).map((r) => r.table_name);
    const missing = EXPECTED_TABLES.filter((t) => !tables.includes(t));
    await sql`create schema if not exists drizzle`;
    await sql`create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`;
    const applied = await sql<{ hash: string; created_at: string }[]>`select hash, created_at from drizzle.__drizzle_migrations order by created_at`;

    console.log(`tables: ${tables.length} (missing from the baseline: ${missing.length ? missing.join(", ") : "none"})`);
    console.log(`recorded migrations: ${applied.length}`);
    if (applied.some((m) => m.hash === baseline.hash)) {
      console.log("baseline already recorded: nothing to do.");
      return;
    }
    if (missing.length) {
      console.log("Refusing: this database doesn't have the baseline's tables. Use `npm run db:migrate` on an empty database.");
      process.exitCode = 1;
      return;
    }
    if (applied.length) {
      console.log("Refusing: this database already has recorded migrations; check them by hand.");
      process.exitCode = 1;
      return;
    }
    if (checkOnly) {
      console.log(`would record baseline (hash ${baseline.hash.slice(0, 12)}…, created_at ${baseline.folderMillis}). Run without --check to do it.`);
      return;
    }
    await sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${baseline.hash}, ${baseline.folderMillis})`;
    console.log("baseline recorded. Next: `npm run db:migrate` applies the migrations after it.");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
