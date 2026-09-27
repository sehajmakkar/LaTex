export type LatexEngine = "pdflatex" | "xelatex" | "lualatex";
export const ENGINES: LatexEngine[] = ["pdflatex", "xelatex", "lualatex"];

export const ENGINE_LABEL: Record<LatexEngine, string> = {
  pdflatex: "pdfLaTeX",
  xelatex: "XeLaTeX",
  lualatex: "LuaLaTeX",
};

/**
 * How Vero picks a TeX engine (the "compiler" in Overleaf's terms):
 *   1. a compiler forced in the project settings;
 *   2. a magic comment in the source (`% !TEX program = xelatex`, or TS-program);
 *   3. the engine that last compiled this project cleanly;
 *   4. `analyzeEngine()`: what the document needs (below).
 * The compile then falls back to other engines when the log shows the engine
 * was the problem (`engineMismatch()`), see services/compile/smart-compile.ts.
 * Keep `latex-service/engine-detect.js` in sync with `analyzeEngine`.
 */

const DIRECTIVE_RE = /^\s*%\s*!\s*TEX\s+(?:TS-)?program\s*=\s*([A-Za-z]+)/gim;

export function toEngine(token: string | null | undefined): LatexEngine | null {
  const t = token?.toLowerCase().trim();
  if (t === "pdflatex" || t === "pdftex") return "pdflatex";
  if (t === "xelatex" || t === "xetex") return "xelatex";
  if (t === "lualatex" || t === "luatex") return "lualatex";
  return null;
}

/** The engine named by a `% !TEX program = …` comment, if any. */
export function engineDirective(content: string): LatexEngine | null {
  DIRECTIVE_RE.lastIndex = 0;
  for (let m = DIRECTIVE_RE.exec(content); m; m = DIRECTIVE_RE.exec(content)) {
    const engine = toEngine(m[1]);
    if (engine) return engine;
  }
  return null;
}

/** Source without comments, so a commented-out \usepackage doesn't count. */
function codeOnly(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      for (let i = 0; i < line.length; i++) if (line[i] === "%" && line[i - 1] !== "\\") return line.slice(0, i);
      return line;
    })
    .join("\n");
}

const pkg = (names: string) => new RegExp(`\\\\(?:usepackage|RequirePackage)\\s*(?:\\[[^\\]]*\\])?\\s*\\{[^}]*\\b(?:${names})\\b[^}]*\\}`);

const SIGNALS = {
  /** Only run on LuaTeX. */
  lua: [pkg("luacode|luatexbase|luaotfload|luatextra|luamplib|lua-visual-debug|luacolor|lualatex-math|selnolig|lua-ul"), /\\(?:directlua|luaexec|luadirect)\s*\{/, /\\begin\s*\{luacode\*?\}/],
  /** Only run on XeTeX. */
  xe: [pkg("xeCJK|xltxtra|xunicode|xetexko|zhspacing|mathspec|xeindex|xecolor"), /\\XeTeX[a-zA-Z]+/],
  /** Need a Unicode engine (XeTeX or LuaTeX). */
  unicode: [
    pkg("fontspec|unicode-math|polyglossia"),
    /\\(?:setmainfont|setsansfont|setmonofont|newfontfamily|defaultfontfeatures|setmathfont)\b/,
    /\\documentclass\s*(?:\[[^\]]*\])?\s*\{ctex(?:art|rep|book|beamer)\}/,
  ],
  /** pdfTeX primitives, which XeTeX and LuaTeX don't define. */
  pdf: [/\\pdf(?:gentounicode|glyphtounicode|minorversion|compresslevel|objcompresslevel)\b/, /\\input\s*\{?\s*glyphtounicode/, /\\pdfoutput\s*=/],
  /** With these, pdfLaTeX can typeset CJK text. */
  pdfScripts: [pkg("CJKutf8|CJK")],
};

/** Scripts pdfLaTeX can't typeset without special setup (CJK, Hangul, Indic, Arabic, Hebrew, Thai). */
const NON_LATIN = /[֐-ࣿऀ-෿฀-๿ᄀ-ᇿ　-鿿가-힯豈-﫿]/;

export type EngineAnalysis = {
  /** Every engine, best first. */
  candidates: LatexEngine[];
  reasons: string[];
};

/** What the document needs, as an ordered list of engines to try. */
export function analyzeEngine(content: string): EngineAnalysis {
  const code = codeOnly(content);
  const has = (list: RegExp[]) => list.some((re) => re.test(code));
  const lua = has(SIGNALS.lua);
  const xe = has(SIGNALS.xe);
  const unicode = has(SIGNALS.unicode);
  const pdf = has(SIGNALS.pdf);
  const nonLatin = NON_LATIN.test(code) && !has(SIGNALS.pdfScripts);

  const reasons: string[] = [];
  let order: LatexEngine[];
  if (lua) {
    reasons.push("uses LuaTeX-only packages or Lua code");
    order = ["lualatex", "xelatex", "pdflatex"];
  } else if (xe) {
    reasons.push("uses XeTeX-only packages");
    order = ["xelatex", "lualatex", "pdflatex"];
  } else if (unicode) {
    reasons.push("uses system/OpenType fonts (fontspec and friends)");
    // Templates that also call pdfTeX primitives usually guard them; pdfLaTeX is the next best guess.
    order = pdf ? ["xelatex", "pdflatex", "lualatex"] : ["xelatex", "lualatex", "pdflatex"];
  } else if (nonLatin && !pdf) {
    reasons.push("contains non-Latin script");
    order = ["xelatex", "lualatex", "pdflatex"];
  } else {
    reasons.push(pdf ? "uses pdfTeX-specific commands" : "standard LaTeX: pdfLaTeX, like Overleaf's default");
    order = ["pdflatex", "xelatex", "lualatex"];
  }
  return { candidates: order, reasons };
}

/** The engine to try first (directive, then analysis). Used where there's no project context. */
export function detectEngine(content: string): LatexEngine {
  return engineDirective(content) ?? analyzeEngine(content).candidates[0];
}

/**
 * Engines to try, best first: directive > last engine that worked > analysis.
 * Always contains all three.
 */
export function engineCandidates(content: string, lastGood?: LatexEngine | null): LatexEngine[] {
  const first = [engineDirective(content), lastGood ?? null].filter((e): e is LatexEngine => !!e);
  return [...new Set([...first, ...analyzeEngine(content).candidates])];
}

/**
 * Reads a failed or error-ridden compile log and says which engines would
 * probably work instead (best first), when the engine itself was the problem.
 * Returns [] for ordinary LaTeX mistakes, where switching engines won't help.
 */
export function engineMismatch(log: string, engine: LatexEngine): LatexEngine[] {
  const undefinedCs = (names: string) =>
    new RegExp(`Undefined control sequence[\\s\\S]{0,400}?\\\\(?:${names})`, "i").test(log);

  const needsLua =
    /LuaTeX is required|requires LuaTeX|(?:only|must) be (?:used|run|compiled) with LuaLaTeX|lualatex is required/i.test(log) ||
    (engine !== "lualatex" && undefinedCs("directlua|luaexec|luadirect"));
  const needsXe = /XeTeX is required|requires XeTeX\b(?! or)|(?:only|must) be (?:used|run|compiled) with XeLaTeX/i.test(log) || (engine !== "xelatex" && undefinedCs("XeTeX[a-zA-Z]+"));
  const needsUnicode =
    /requires? (?:either )?XeTeX or LuaTeX|XeLaTeX or LuaLaTeX (?:is|are) required|Cannot be run with pdfLaTeX|Fatal (?:Package )?fontspec Error|fontspec Error: The fontspec package requires/i.test(log) ||
    // Older LaTeX says "Package inputenc Error: Unicode character …", LaTeX 2018+ "LaTeX Error: Unicode character …".
    (engine === "pdflatex" && /(?:Package inputenc|LaTeX) Error: (?:Unicode character|Invalid UTF-8)/i.test(log));
  const needsPdf =
    engine !== "pdflatex" &&
    (undefinedCs("pdf(?:gentounicode|glyphtounicode|minorversion|compresslevel|objcompresslevel|output)") ||
      /pdftex\.def.*(?:Error|only)|This package requires pdfTeX|requires pdfLaTeX/i.test(log));
  const fontNotFound = /fontspec Error: The font "[^"]+" cannot be found|luaotfload.*font.*not found|Font \\[^ ]+ = [^ ]+ not loadable/i.test(log);

  const out: LatexEngine[] = [];
  const add = (...engines: LatexEngine[]) => engines.forEach((e) => e !== engine && !out.includes(e) && out.push(e));
  if (needsLua) add("lualatex");
  if (needsXe) add("xelatex");
  if (needsUnicode) add("xelatex", "lualatex");
  if (needsPdf) add("pdflatex", "lualatex");
  // XeTeX and LuaTeX find fonts differently; one may succeed where the other fails.
  if (fontNotFound && engine !== "pdflatex") add(engine === "xelatex" ? "lualatex" : "xelatex");
  return out;
}
