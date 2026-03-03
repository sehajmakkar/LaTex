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

  async findByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async findByDodoCustomerId(dodoCustomerId: string) {
    return db.query.users.findFirst({
      where: eq(users.dodoCustomerId, dodoCustomerId),
    });
  }

  async updateDodoSubscription(
    userId: string,
    data: {
      plan: string;
      subscriptionStatus: string | null;
      dodoCustomerId?: string | null;
      dodoSubscriptionId?: string | null;
    }
  ) {
    const [updated] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }
}

export const userRepository = new UserRepository();
