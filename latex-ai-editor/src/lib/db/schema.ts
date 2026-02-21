import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("Untitled Project"),
  content: text("content").notNull().default(""),
  userId: text("user_id"),
  templateId: text("template_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const compilations = pgTable("compilations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  pdfUrl: text("pdf_url"),
  log: text("log"),
  duration: integer("duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Compilation = typeof compilations.$inferSelect;
export type NewCompilation = typeof compilations.$inferInsert;
