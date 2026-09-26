/**
 * Checks an AI replacement before it can reach the editor. Every rule compares
 * the output with the original selection, so a fragment that was already
 * "unusual" (a table row, a macro definition) stays editable while the AI
 * can't introduce anything new of that kind.
 */

export type ValidationResult = { ok: true; replacement: string } | { ok: false; reason: string };

export type ValidationInput = {
  output: string;
  selection: string;
  instruction: string;
  /** Surrounding source the model saw; numbers found here are not "invented". */
  context?: string;
  /** Allow new \\usepackage / macro definitions (preamble layout edits the user asked for). */
  allowStructural?: boolean;
};

/** Never allowed unless already present in the selection: file, shell, Lua, catcode tricks. */
const DANGEROUS_COMMANDS = [
  "input", "include", "InputIfFileExists", "write", "write18", "immediate", "openin", "openout",
  "read", "readline", "closein", "closeout", "directlua", "luaexec", "latelua", "luadirect",
  "luacode", "catcode", "special", "csname", "scantokens", "ShellEscape",
];

/** Allowed only if the instruction asks for them (by name or topic). */
const STRUCTURAL_COMMANDS: Record<string, RegExp> = {
  usepackage: /usepackage|package/i,
  RequirePackage: /package/i,
  documentclass: /documentclass|class/i,
  def: /\bdef\b|macro|command/i,
  edef: /\bdef\b|macro|command/i,
  gdef: /\bdef\b|macro|command/i,
  xdef: /\bdef\b|macro|command/i,
  let: /\blet\b|macro|command/i,
  newcommand: /newcommand|macro|command/i,
  renewcommand: /renewcommand|macro|command/i,
};

const DELETE_INTENT = /\b(delete|remove|clear|erase|drop)\b/i;

type Scan = {
  commands: Map<string, number>;
  environments: Map<string, number>;
  braceDelta: number;
  bracketDelta: number;
  unescaped: { "%": number; "&": number; "#": number };
  caretEscapes: number;
};

/** Minimal LaTeX tokenizer: commands, env balance, unescaped specials; comments skipped. */
export function scanLatex(text: string): Scan {
  const scan: Scan = {
    commands: new Map(),
    environments: new Map(),
    braceDelta: 0,
    bracketDelta: 0,
    unescaped: { "%": 0, "&": 0, "#": 0 },
    caretEscapes: 0,
  };
  const bump = (map: Map<string, number>, key: string, by = 1) => map.set(key, (map.get(key) ?? 0) + by);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") {
      const rest = text.slice(i + 1);
      const name = /^[a-zA-Z@]+/.exec(rest)?.[0];
      if (!name) {
        i++; // escaped single character, e.g. \% \{ \\
        continue;
      }
      bump(scan.commands, name);
      i += name.length;
      if (name === "begin" || name === "end") {
        const env = /^\s*\{([^}]*)\}/.exec(text.slice(i + 1));
        if (env) bump(scan.environments, env[1].trim(), name === "begin" ? 1 : -1);
      }
      continue;
    }
    if (ch === "%") {
      scan.unescaped["%"]++;
      const eol = text.indexOf("\n", i);
      i = eol === -1 ? text.length : eol;
      continue;
    }
    if (ch === "{") scan.braceDelta++;
    else if (ch === "}") scan.braceDelta--;
    else if (ch === "[") scan.bracketDelta++;
    else if (ch === "]") scan.bracketDelta--;
    else if (ch === "&" || ch === "#") scan.unescaped[ch]++;
    else if (ch === "^" && text[i + 1] === "^") {
      scan.caretEscapes++;
      i++;
    }
  }
  return scan;
}

/** Removes markdown code fences and stray surrounding whitespace lines. */
export function stripFences(text: string): string {
  return text
    .replace(/^\s*```(?:latex|tex)?[ \t]*\n?/i, "")
    .replace(/\n?```\s*$/i, "");
}

/** Numbers like 35, 2.5, 1,000 (commas ignored when comparing). */
export function numbersIn(text: string): Set<string> {
  return new Set((text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, "")));
}

/**
 * Layout values (10pt, 0.6in, 0.9\textwidth, \linespread{0.95}) are not facts
 * about the person, so the no-new-numbers rule ignores them.
 */
const LAYOUT_NUMBER =
  /-?\d*\.?\d+(?:pt|em|ex|in|cm|mm|bp|pc|sp)\b|-?\d*\.?\d+\s*\\(?:text|line|column|paper)(?:width|height)\b|\\(?:linespread|fontsize)\s*\{[\d.\s]*\}(?:\s*\{[\d.\s]*\})?|\\baselinestretch\s*\}\s*\{[\d.\s]*\}/g;

export function factualNumbersIn(text: string): Set<string> {
  return numbersIn(text.replace(LAYOUT_NUMBER, " "));
}

const sameMap = (a: Map<string, number>, b: Map<string, number>) => {
  const keys = new Set([...a.keys(), ...b.keys()]);
  return [...keys].every((k) => (a.get(k) ?? 0) === (b.get(k) ?? 0));
};

export function validateInlineEdit({ output, selection, instruction, context = "", allowStructural = false }: ValidationInput): ValidationResult {
  const replacement = stripFences(output);

  if (!replacement.trim()) {
    return DELETE_INTENT.test(instruction) || !selection.trim()
      ? { ok: true, replacement }
      : { ok: false, reason: "The replacement is empty, but the instruction didn't ask to delete anything." };
  }

  const maxLength = selection.length * 4 + 2048;
  if (replacement.length > maxLength) {
    return { ok: false, reason: `The replacement is too long (${replacement.length} chars, limit ${maxLength}). Edit only the selection.` };
  }

  const out = scanLatex(replacement);
  const sel = scanLatex(selection);

  for (const name of DANGEROUS_COMMANDS) {
    if ((out.commands.get(name) ?? 0) > (sel.commands.get(name) ?? 0)) {
      return { ok: false, reason: `The replacement adds \\${name}, which is not allowed.` };
    }
  }
  if (out.caretEscapes > sel.caretEscapes) {
    return { ok: false, reason: "The replacement adds ^^ character escapes, which are not allowed." };
  }
  for (const [name, askedFor] of Object.entries(STRUCTURAL_COMMANDS)) {
    if ((out.commands.get(name) ?? 0) > (sel.commands.get(name) ?? 0) && !allowStructural && !askedFor.test(instruction)) {
      return { ok: false, reason: `The replacement adds \\${name}, but the instruction didn't ask for it.` };
    }
  }
  const documentMarkers = (text: string) => (text.match(/\\(?:begin|end)\s*\{document\}/g) ?? []).length;
  if (documentMarkers(replacement) > documentMarkers(selection) && !/document/i.test(instruction)) {
    return { ok: false, reason: "The replacement adds \\begin{document}/\\end{document}, which the instruction didn't ask for." };
  }

  if (out.braceDelta !== sel.braceDelta) {
    return { ok: false, reason: "Unbalanced braces: the replacement must open and close { } exactly like the selection." };
  }
  if (out.bracketDelta !== sel.bracketDelta) {
    return { ok: false, reason: "Unbalanced brackets: the replacement must open and close [ ] exactly like the selection." };
  }
  if (!sameMap(out.environments, sel.environments)) {
    return { ok: false, reason: "Unmatched \\begin/\\end: every environment must open and close exactly as in the selection." };
  }

  if (out.unescaped["%"] > sel.unescaped["%"]) {
    return { ok: false, reason: "The replacement has an unescaped %, which comments out the rest of the line. Write \\% for a percent sign." };
  }
  if (out.unescaped["&"] > sel.unescaped["&"] && !/table|tabular|column|align/i.test(instruction)) {
    return { ok: false, reason: "The replacement has an unescaped &. Write \\& in normal text." };
  }
  if (out.unescaped["#"] > sel.unescaped["#"]) {
    return { ok: false, reason: "The replacement has an unescaped #. Write \\# in normal text." };
  }

  const allowed = numbersIn(`${selection}\n${instruction}\n${context}`);
  const invented = [...factualNumbersIn(replacement)].filter((n) => !allowed.has(n));
  if (invented.length > 0) {
    return {
      ok: false,
      reason: `The replacement adds numbers that aren't in the selection or instruction (${invented.slice(0, 5).join(", ")}). Don't invent facts; use a placeholder like [X] instead.`,
    };
  }

  return { ok: true, replacement };
}
