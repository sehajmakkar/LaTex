import type { TemplateManifest, TemplateVariable } from "@/types";

const COMMON_VARIABLES: TemplateVariable[] = [
  { key: "name", label: "Full Name", placeholder: "Jane Doe", required: true },
  { key: "email", label: "Email", placeholder: "jane@example.com", required: true },
  { key: "phone", label: "Phone", placeholder: "+1 (555) 000-0000" },
  { key: "location", label: "Location", placeholder: "San Francisco, CA" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/janedoe" },
  { key: "github", label: "GitHub", placeholder: "github.com/janedoe" },
  { key: "website", label: "Website", placeholder: "janedoe.dev" },
];

export const TEMPLATE_MANIFESTS: Record<string, TemplateManifest> = {
  "modern-tech": {
    id: "modern-tech",
    name: "Modern Tech",
    description: "Clean, single-column layout with clear sections for experience, skills, and projects. Ideal for software engineers and developers.",
    category: "Developer",
    variables: COMMON_VARIABLES,
  },
  "minimalist-dev": {
    id: "minimalist-dev",
    name: "Minimalist Dev",
    description: "Minimal design with strong typography. Perfect for senior engineers who prefer a no-frills, content-first resume.",
    category: "Developer",
    variables: COMMON_VARIABLES,
  },
  "classic-developer": {
    id: "classic-developer",
    name: "Classic Developer",
    description: "Traditional two-section layout with sidebar for contact and skills. Great for full-stack and backend roles.",
    category: "Developer",
    variables: COMMON_VARIABLES,
  },
  "tech-lead": {
    id: "tech-lead",
    name: "Tech Lead",
    description: "Structured for leadership roles with emphasis on impact, scope, and technologies. Sections for leadership and technical depth.",
    category: "Developer",
    variables: COMMON_VARIABLES,
  },
};
