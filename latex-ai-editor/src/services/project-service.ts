import { projectRepository } from "@/repositories/project-repository";
import { userService, FREE_PROJECT_LIMIT } from "@/services/user-service";
import { NotFoundError, ProjectLimitError } from "@/lib/errors";

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
        `Free accounts are limited to ${FREE_PROJECT_LIMIT} projects. Delete a project to create a new one.`
      );
    }
    return projectRepository.create({
      ...data,
      userId,
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
