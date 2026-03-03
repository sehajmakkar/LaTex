import { db } from "@/lib/db";
import {
  atsReports,
  type NewATSReport,
  type ATSReport as ATSReportRow,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

class AtsRepository {
  async create(data: NewATSReport): Promise<ATSReportRow> {
    const [row] = await db.insert(atsReports).values(data).returning();
    return row;
  }

  async findById(id: string, userId: string): Promise<ATSReportRow | null> {
    const rows = await db
      .select()
      .from(atsReports)
      .where(and(eq(atsReports.id, id), eq(atsReports.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async listByUser(userId: string, limit = 20): Promise<ATSReportRow[]> {
    return db
      .select()
      .from(atsReports)
      .where(eq(atsReports.userId, userId))
      .orderBy(desc(atsReports.createdAt))
      .limit(limit);
  }
}

export const atsRepository = new AtsRepository();

