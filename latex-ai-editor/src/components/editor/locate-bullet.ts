/** Words of a line with LaTeX commands, braces and escapes removed. */
function words(text: string): string[] {
  return text
    .replace(/\\[a-zA-Z@]+\*?/g, " ")
    .replace(/\\([%$&#_])/g, "$1")
    .toLowerCase()
    .split(/[^a-z0-9%$+#]+/)
    .filter((w) => w.length > 1);
}

/**
 * Finds the source line that holds a bullet shown in the ATS report (plain
 * text) by word overlap, since the source has LaTeX markup around it.
 * Returns the character range of that line's content, or null.
 */
export function locateBullet(doc: string, bullet: string): { from: number; to: number } | null {
  const target = new Set(words(bullet));
  if (target.size === 0) return null;
  let best: { score: number; from: number; to: number } | null = null;
  let offset = 0;
  for (const line of doc.split("\n")) {
    const lineWords = new Set(words(line));
    let hits = 0;
    for (const w of target) if (lineWords.has(w)) hits++;
    const score = hits / target.size;
    if (score > (best?.score ?? 0)) {
      const lead = line.length - line.trimStart().length;
      best = { score, from: offset + lead, to: offset + line.trimEnd().length };
    }
    offset += line.length + 1;
  }
  return best && best.score >= 0.6 ? { from: best.from, to: best.to } : null;
}
