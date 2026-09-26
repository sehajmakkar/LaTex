import { db } from "@/lib/db";
import { userUsage } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

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

  /** Sum of AI edits since `monthStart` (YYYY-MM-DD). */
  async sumAiEditsSince(userId: string, monthStart: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${userUsage.aiEdits}), 0)::int` })
      .from(userUsage)
      .where(and(eq(userUsage.userId, userId), gte(userUsage.date, monthStart)));
    return row?.total ?? 0;
  }

  /** ATS scans with an AI review since `monthStart` (YYYY-MM-DD). */
  async sumAtsScansSince(userId: string, monthStart: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${userUsage.atsScans}), 0)::int` })
      .from(userUsage)
      .where(and(eq(userUsage.userId, userId), gte(userUsage.date, monthStart)));
    return row?.total ?? 0;
  }

  async sumAiCommandsSince(userId: string, monthStart: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${userUsage.aiCommands}), 0)::int` })
      .from(userUsage)
      .where(and(eq(userUsage.userId, userId), gte(userUsage.date, monthStart)));
    return row?.total ?? 0;
  }

  async incrementAiCommands(userId: string, today: string) {
    await this.getOrCreateToday(userId, today);
    await db
      .update(userUsage)
      .set({ aiCommands: sql`${userUsage.aiCommands} + 1` })
      .where(and(eq(userUsage.userId, userId), eq(userUsage.date, today)));
  }

  async incrementAiEdits(userId: string, today: string) {
    await this.getOrCreateToday(userId, today);
    await db
      .update(userUsage)
      .set({ aiEdits: sql`${userUsage.aiEdits} + 1` })
      .where(and(eq(userUsage.userId, userId), eq(userUsage.date, today)));
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

