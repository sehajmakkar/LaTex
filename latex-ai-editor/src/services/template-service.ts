import {
  getTemplateById,
  getTemplateManifests,
  substituteVariables,
} from "@/templates";
import { NotFoundError } from "@/lib/errors";
import type { Template, TemplateManifest } from "@/types";

class TemplateService {
  list(): TemplateManifest[] {
    return getTemplateManifests();
  }

  getById(id: string, variables?: Record<string, string>): Template {
    const template = getTemplateById(id);
    if (!template) {
      throw new NotFoundError("Template");
    }
    if (variables && Object.keys(variables).length > 0) {
      return {
        ...template,
        content: substituteVariables(template.content, variables),
      };
    }
    return template;
  }

  getContentWithVariables(
    id: string,
    variables: Record<string, string>
  ): string {
    const template = getTemplateById(id);
    if (!template) {
      throw new NotFoundError("Template");
    }
    return substituteVariables(template.content, variables);
  }
}

export const templateService = new TemplateService();
