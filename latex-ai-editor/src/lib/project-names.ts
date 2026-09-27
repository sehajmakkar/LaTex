/** Resume names are capped at 100 characters (see the projects API). */
export const MAX_PROJECT_NAME = 100;

/**
 * Name for a copy, like Overleaf's "Make a copy": "Resume (copy)", then
 * "Resume (copy 2)"… skipping names already taken. Copying a copy doesn't
 * stack suffixes ("Resume (copy) (copy)").
 */
export function copyName(name: string, taken: Iterable<string> = []): string {
  const base = (name.trim().replace(/\s*\(copy(?: \d+)?\)$/i, "") || "Untitled resume").trim();
  const used = new Set([...taken].map((n) => n.trim().toLowerCase()));
  for (let i = 1; ; i++) {
    const suffix = i === 1 ? " (copy)" : ` (copy ${i})`;
    const candidate = base.slice(0, MAX_PROJECT_NAME - suffix.length).trimEnd() + suffix;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}
