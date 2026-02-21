import { projectRepository } from "@/repositories/project-repository";
import { NotFoundError } from "@/lib/errors";
import type { NewProject } from "@/lib/db/schema";

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

  async getAll() {
    return projectRepository.findAll();
  }

  async create(data: NewProject) {
    return projectRepository.create(data);
  }

  async update(id: string, data: Partial<NewProject>) {
    const existing = await projectRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Project");
    }
    return projectRepository.update(id, data);
  }

  async delete(id: string) {
    const existing = await projectRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Project");
    }
    return projectRepository.delete(id);
  }
}

export const projectService = new ProjectService();
