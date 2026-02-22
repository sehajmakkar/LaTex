import { db } from "@/lib/db";
import { users, projects, type NewUser } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

class UserRepository {
  async findByClerkId(clerkId: string) {
    return db.query.users.findFirst({
      where: eq(users.id, clerkId),
    });
  }

  async upsert(data: NewUser) {
    const [user] = await db
      .insert(users)
      .values(data)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: data.email,
          name: data.name,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async countProjectsByUserId(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.userId, userId));
    return result[0]?.count ?? 0;
  }
}

export const userRepository = new UserRepository();
