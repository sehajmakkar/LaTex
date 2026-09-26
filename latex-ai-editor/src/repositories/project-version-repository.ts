import { db } from "@/lib/db";
import { projectVersions } from "@/lib/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

class ProjectVersionRepository {
  /** Saves a snapshot and prunes the oldest beyond `keep`. */
  async create(data: typeof projectVersions.$inferInsert, keep: number) {
    const [row] = await db.insert(projectVersions).values(data).returning();
    const all = await db
      .select({ id: projectVersions.id })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, data.projectId))
      .orderBy(desc(projectVersions.createdAt));
    const stale = all.slice(keep).map((r) => r.id);
    if (stale.length) await db.delete(projectVersions).where(inArray(projectVersions.id, stale));
    return row;
  }

  async list(projectId: string, userId: string) {
    return db
      .select({ id: projectVersions.id, label: projectVersions.label, createdAt: projectVersions.createdAt })
      .from(projectVersions)
      .where(and(eq(projectVersions.projectId, projectId), eq(projectVersions.userId, userId)))
      .orderBy(desc(projectVersions.createdAt));
  }

  async get(id: string, projectId: string, userId: string) {
    const [row] = await db
      .select()
      .from(projectVersions)
      .where(and(eq(projectVersions.id, id), eq(projectVersions.projectId, projectId), eq(projectVersions.userId, userId)))
      .limit(1);
    return row ?? null;
  }
}

export const projectVersionRepository = new ProjectVersionRepository();
