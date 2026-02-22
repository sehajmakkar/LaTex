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
    description: "Clean single-column layout for software engineers.",
    category: "Developer",
    variables: COMMON_VARIABLES,
  },
  "minimalist-dev": {
    id: "minimalist-dev",
    name: "Minimalist Dev",
    description: "Minimal design, content-first for senior engineers.",
    category: "Developer",
    variables: COMMON_VARIABLES,
  },
  "classic-developer": {
    id: "classic-developer",
    name: "Classic Developer",
    description: "Two-section layout with sidebar for full-stack roles.",
    category: "Developer",
    variables: COMMON_VARIABLES,
  },
  "tech-lead": {
    id: "tech-lead",
    name: "Tech Lead",
    description: "Structured for leadership and technical depth.",
    category: "Developer",
    variables: COMMON_VARIABLES,
  },
};
