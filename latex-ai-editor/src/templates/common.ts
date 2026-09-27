import type { TemplateVariable } from "@/types";

/** Shared variables used by all resume templates. */
export const COMMON_VARIABLES: TemplateVariable[] = [
  { key: "name", label: "Full Name", placeholder: "Jane Doe", required: true },
  { key: "email", label: "Email", placeholder: "jane@example.com", required: true },
  { key: "phone", label: "Phone", placeholder: "+1 (555) 000-0000" },
  { key: "location", label: "Location", placeholder: "San Francisco, CA" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/janedoe" },
  { key: "github", label: "GitHub", placeholder: "github.com/janedoe" },
  { key: "website", label: "Website", placeholder: "janedoe.dev" },
];

/** Gallery sections, in order. Catalog templates are tagged with these (scripts/templates/sources.ts). */
export const TEMPLATE_TAGS = [
  "Most popular",
  "Software engineering",
  "Product & business",
  "Academic & research",
  "Students & new grads",
  "Two-column",
  "Creative",
] as const;

export type TemplateTag = (typeof TEMPLATE_TAGS)[number];
