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

/** Ordered list of filter tags shown in the dropdown. */
export const TEMPLATE_TAGS = [
  "Top Picks",
  "SDE 1",
  "Single Column",
  "Two Column",
  "Leadership",
] as const;

export type TemplateTag = (typeof TEMPLATE_TAGS)[number];
