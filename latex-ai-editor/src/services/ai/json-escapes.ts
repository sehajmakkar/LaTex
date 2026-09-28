const CONTROL_ESCAPES: [string, string][] = [
  ["\b", "\\b"],
  ["\f", "\\f"],
  ["\r", "\\r"],
  ["\t", "\\t"],
];

/**
 * Gemini sometimes writes a LaTeX backslash unescaped inside its JSON, so
 * "\resumeItem" parses as a carriage return + "esumeItem", "\textbf" as a tab +
 * "extbf" and "\frac" as a form feed + "rac". The text then matches nothing in
 * the document. A control character directly followed by a letter doesn't occur
 * in real LaTeX, so it's turned back into the macro, unless `doc` itself has
 * that pattern (a tab-indented document, say). "\n" is ambiguous with a real
 * line break, so it's repaired only for a macro `doc` uses that never follows a
 * real line break there ("\newline", "\noindent").
 */
export function repairJsonEscapes(text: string, doc: string): string {
  let out = text;
  for (const [char, macro] of CONTROL_ESCAPES) {
    if (!out.includes(char) || new RegExp(`${char}[A-Za-z]`).test(doc)) continue;
    out = out.replace(new RegExp(`${char}(?=[A-Za-z])`, "g"), macro);
  }
  return out.replace(/\n(?=([a-z]+))/g, (match, word: string) =>
    doc.includes(`\\n${word}`) && !doc.includes(`\n${word}`) ? "\\n" : match
  );
}
