import { TEMPLATE_MANIFESTS } from "./manifests";
import { MODERN_TECH_CONTENT } from "./modern-tech";
import { MINIMALIST_DEV_CONTENT } from "./minimalist-dev";
import { CLASSIC_DEVELOPER_CONTENT } from "./classic-developer";
import { TECH_LEAD_CONTENT } from "./tech-lead";
import type { Template, TemplateManifest } from "@/types";

const TEMPLATE_CONTENT: Record<string, string> = {
  "modern-tech": MODERN_TECH_CONTENT,
  "minimalist-dev": MINIMALIST_DEV_CONTENT,
  "classic-developer": CLASSIC_DEVELOPER_CONTENT,
  "tech-lead": TECH_LEAD_CONTENT,
};

export function getTemplateIds(): string[] {
  return Object.keys(TEMPLATE_MANIFESTS);
}

export function getTemplateManifests(): TemplateManifest[] {
  return Object.values(TEMPLATE_MANIFESTS);
}

export function getTemplateById(id: string): Template | null {
  const manifest = TEMPLATE_MANIFESTS[id];
  const content = TEMPLATE_CONTENT[id];
  if (!manifest || !content) return null;
  return { ...manifest, content };
}

export function substituteVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  const urlKeys = ["linkedin", "github", "website"];
  for (const [key, value] of Object.entries(variables)) {
    const replacement =
      value?.trim() ||
      (urlKeys.includes(key) ? "#" : "");
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), replacement);
  }
  return result;
}
