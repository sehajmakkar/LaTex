import { db } from "@/lib/db";
import { aiMessages } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

class AiMessageRepository {
  async create(data: typeof aiMessages.$inferInsert) {
    const [row] = await db.insert(aiMessages).values(data).returning();
    return row;
  }

  /** Most recent messages for a project, oldest first. */
  async listRecent(projectId: string, userId: string, limit = 30) {
    const rows = await db
      .select()
      .from(aiMessages)
      .where(and(eq(aiMessages.projectId, projectId), eq(aiMessages.userId, userId)))
      .orderBy(desc(aiMessages.createdAt))
      .limit(limit);
    return rows.reverse();
  }

  async setStatus(id: string, userId: string, status: string) {
    const [row] = await db
      .update(aiMessages)
      .set({ status })
      .where(and(eq(aiMessages.id, id), eq(aiMessages.userId, userId)))
      .returning();
    return row ?? null;
  }
}

export const aiMessageRepository = new AiMessageRepository();
