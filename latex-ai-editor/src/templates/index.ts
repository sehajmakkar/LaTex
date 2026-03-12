/**
 * Template Registry
 *
 * How to add a new template:
 * 1. Create a file in the appropriate tag folder (e.g., top-picks/my-template.ts)
 *    that exports `manifest` (TemplateManifest) and `content` (string).
 * 2. Re-export it from that folder's index.ts barrel file.
 * 3. Import it below and add it to the ALL_TEMPLATES array.
 * 4. Done — it will appear on the templates page under its tags.
 */

import type { Template, TemplateManifest } from "@/types";
export { TEMPLATE_TAGS } from "./common";

// --- Import all templates from tag-based folders ---
import {
  modernTechManifest,
  modernTechContent,
  classicDevManifest,
  classicDevContent,
} from "./top-picks";

import {
  minimalistDevManifest,
  minimalistDevContent,
} from "./sde-1";

import {
  techLeadManifest,
  techLeadContent,
} from "./leadership";

import {
  chicagoManifest,
  chicagoContent,
  milanoManifest,
  milanoContent,
  classicManifest,
  classicContent,
} from "./classic";

import {
  geometricManifest,
  geometricContent,
} from "./geometric";

import {
  projectHighlightsManifest,
  projectHighlightsContent,
} from "./highlights";

import {
  technicalManifest,
  technicalContent,
} from "./technical";

import {
  academicManifest,
  academicContent,
  scholarlyManifest,
  scholarlyContent,
} from "./academic";

// --- Template registry: add new templates here ---
const ALL_TEMPLATES: { manifest: TemplateManifest; content: string }[] = [
  // Existing templates
  { manifest: modernTechManifest, content: modernTechContent },
  { manifest: classicDevManifest, content: classicDevContent },
  { manifest: minimalistDevManifest, content: minimalistDevContent },
  { manifest: techLeadManifest, content: techLeadContent },

  // New classic family
  { manifest: chicagoManifest, content: chicagoContent },
  { manifest: milanoManifest, content: milanoContent },
  { manifest: classicManifest, content: classicContent },

  // New layout styles
  { manifest: geometricManifest, content: geometricContent },
  { manifest: projectHighlightsManifest, content: projectHighlightsContent },
  { manifest: technicalManifest, content: technicalContent },

  // Academic-focused
  { manifest: academicManifest, content: academicContent },
  { manifest: scholarlyManifest, content: scholarlyContent },
];

// Build lookup maps
const MANIFEST_MAP: Record<string, TemplateManifest> = {};
const CONTENT_MAP: Record<string, string> = {};

for (const t of ALL_TEMPLATES) {
  MANIFEST_MAP[t.manifest.id] = t.manifest;
  CONTENT_MAP[t.manifest.id] = t.content;
}

// --- Public API ---

export function getTemplateIds(): string[] {
  return Object.keys(MANIFEST_MAP);
}

export function getTemplateManifests(): TemplateManifest[] {
  return Object.values(MANIFEST_MAP);
}

export function getTemplateById(id: string): Template | null {
  const manifest = MANIFEST_MAP[id];
  const content = CONTENT_MAP[id];
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
