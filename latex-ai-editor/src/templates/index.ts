/**
 * Template Registry
 *
 * The gallery shows the catalog: popular, openly licensed templates imported
 * unchanged from their sources by `scripts/import-templates.ts` (edit
 * `scripts/templates/sources.ts` and re-run it to add one).
 *
 * The older hand-copied templates below are "legacy": hidden from the gallery
 * but still resolvable by id, so existing links and projects keep working.
 */

import type { Template, TemplateManifest } from "@/types";
import { CATALOG } from "./catalog";
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

// --- Legacy (hand-copied) templates: resolvable by id, not listed ---
const LEGACY_TEMPLATES: { manifest: TemplateManifest; content: string }[] = [
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

// Build lookup maps (catalog ids win over legacy ones)
const MANIFEST_MAP: Record<string, TemplateManifest> = {};
const CONTENT_MAP: Record<string, string> = {};

for (const t of [...LEGACY_TEMPLATES, ...CATALOG]) {
  MANIFEST_MAP[t.manifest.id] = t.manifest;
  CONTENT_MAP[t.manifest.id] = t.content;
}

// --- Public API ---

export function getTemplateIds(): string[] {
  return Object.keys(MANIFEST_MAP);
}

/** Templates shown in the gallery: the imported catalog. */
export function getTemplateManifests(): TemplateManifest[] {
  return CATALOG.map((t) => t.manifest);
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
