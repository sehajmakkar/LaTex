import { projectRepository } from "@/repositories/project-repository";
import { userService, FREE_PROJECT_LIMIT } from "@/services/user-service";
import { NotFoundError, ProjectLimitError } from "@/lib/errors";
import { copyName } from "@/lib/project-names";

class ProjectService {
  async getById(id: string) {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw new NotFoundError("Project");
    }
    return project;
  }

  async getByUserId(userId: string) {
    return projectRepository.findByUserId(userId);
  }

  async createForUser(
    userId: string,
    data: { name: string; content: string; templateId: string | null }
  ) {
    const canCreate = await userService.canCreateProject(userId);
    if (!canCreate) {
      throw new ProjectLimitError(
        `The free plan includes ${FREE_PROJECT_LIMIT} resumes. Delete one, or upgrade to Pro for unlimited resumes.`
      );
    }
    return projectRepository.create({
      ...data,
      userId,
    });
  }

  /**
   * Copies a resume's LaTeX into a new resume (like Overleaf's "Make a copy").
   * The AI conversation and version history stay with the original. Counts
   * toward the plan's resume limit.
   */
  async duplicate(id: string, userId: string, name?: string) {
    const source = await projectRepository.findById(id);
    if (!source || source.userId !== userId) throw new NotFoundError("Project");
    const taken = name ? [] : (await projectRepository.findByUserId(userId)).map((p) => p.name);
    return this.createForUser(userId, {
      name: name?.trim() || copyName(source.name, taken),
      content: source.content,
      templateId: source.templateId,
    });
  }

  async update(id: string, userId: string, data: { name?: string; content?: string }) {
    const existing = await projectRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Project");
    }
    if (existing.userId !== userId) {
      throw new NotFoundError("Project");
    }
    return projectRepository.update(id, data);
  }

  async delete(id: string, userId: string) {
    const existing = await projectRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Project");
    }
    if (existing.userId !== userId) {
      throw new NotFoundError("Project");
    }
    return projectRepository.delete(id);
  }
}

export const projectService = new ProjectService();
