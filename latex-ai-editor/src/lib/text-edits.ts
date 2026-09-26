/** Client-safe helpers for applying AI command edits to a LaTeX document. */

export type TextEdit = { find: string; replace: string; from: number; to: number };

/** Applies non-overlapping edits (positions refer to `doc`). */
export function applyEdits(doc: string, edits: TextEdit[]): string {
  let out = "";
  let cursor = 0;
  for (const e of [...edits].sort((a, b) => a.from - b.from)) {
    out += doc.slice(cursor, e.from) + e.replace;
    cursor = e.to;
  }
  return out + doc.slice(cursor);
}

/**
 * Re-locates edits in a document that changed while the AI was answering.
 * An edit is kept if its text is still at the same place, or still occurs
 * exactly once; otherwise it is dropped.
 */
export function rebaseEdits(doc: string, edits: TextEdit[]): { edits: TextEdit[]; dropped: number } {
  const kept: TextEdit[] = [];
  for (const e of edits) {
    let from = doc.slice(e.from, e.to) === e.find ? e.from : doc.indexOf(e.find);
    if (from !== e.from && (from === -1 || doc.indexOf(e.find, from + 1) !== -1)) from = -1;
    const to = from + e.find.length;
    if (from === -1 || kept.some((k) => from < k.to && to > k.from)) continue;
    kept.push({ ...e, from, to });
  }
  return { edits: kept, dropped: edits.length - kept.length };
}

export type LatexSection = { label: string; from: number; to: number };

/** Top-level \section{...} blocks, each running to the next section or \end{document}. */
export function findSections(doc: string): LatexSection[] {
  const end = doc.indexOf("\\end{document}");
  const limit = end === -1 ? doc.length : end;
  const starts: { label: string; from: number }[] = [];
  const re = /^[ \t]*\\section\*?\{([^{}\n]*(?:\{[^{}\n]*\}[^{}\n]*)*)\}/gm;
  for (let m = re.exec(doc); m; m = re.exec(doc)) {
    if (m.index >= limit) break;
    const label = m[1].replace(/\\[a-zA-Z]+\s*/g, "").replace(/[{}]/g, "").trim() || "Untitled";
    starts.push({ label, from: m.index });
  }
  return starts.map((s, i) => ({ ...s, to: i + 1 < starts.length ? starts[i + 1].from : limit }));
}
