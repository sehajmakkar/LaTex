import { db } from "@/lib/db";
import { projects, type NewProject } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

class ProjectRepository {
  async findById(id: string) {
    return db.query.projects.findFirst({
      where: eq(projects.id, id),
    });
  }

  async findByUserId(userId: string) {
    return db.query.projects.findMany({
      where: eq(projects.userId, userId),
      orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
    });
  }

  async findAll() {
    return db.query.projects.findMany({
      orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
    });
  }

  async create(data: NewProject) {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async update(id: string, data: Partial<NewProject>) {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async delete(id: string) {
    await db.delete(projects).where(eq(projects.id, id));
  }
}

export const projectRepository = new ProjectRepository();
