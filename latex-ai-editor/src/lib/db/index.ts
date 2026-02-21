import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

const client = connectionString
  ? postgres(connectionString)
  : postgres({
      host: "localhost",
      port: 5432,
      database: "latex_ai_editor",
      user: "latex",
      password: "latex",
    });

export const db = drizzle(client, { schema });
