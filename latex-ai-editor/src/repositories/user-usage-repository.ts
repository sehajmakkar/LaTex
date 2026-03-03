import { db } from "@/lib/db";
import { userUsage } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

class UserUsageRepository {
  async getOrCreateToday(userId: string, today: string) {
    const existing = await db
      .select()
      .from(userUsage)
      .where(and(eq(userUsage.userId, userId), eq(userUsage.date, today)))
      .limit(1);

    if (existing[0]) return existing[0];

    const [created] = await db
      .insert(userUsage)
      .values({
        userId,
        date: today,
      })
      .returning();
    return created;
  }

  async incrementAtsScans(userId: string, today: string) {
    const [row] = await db
      .update(userUsage)
      .set({
        atsScans: sql`${userUsage.atsScans} + 1`,
      })
      .where(and(eq(userUsage.userId, userId), eq(userUsage.date, today)))
      .returning();
    return row;
  }
}

export const userUsageRepository = new UserUsageRepository();

