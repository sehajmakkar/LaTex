/**
 * Must stay in sync with `src/lib/latex-engine.ts` (detectEngine).
 * @param {string} content
 * @returns {"pdflatex"|"xelatex"|"lualatex"}
 */
function detectEngine(content) {
  const TEX_PROGRAM_RE = /%\s*!TEX\s+program\s*=\s*(\w+)/gi;

  function normalizeEngineFromDirective(token) {
    const lower = token.toLowerCase();
    if (lower === "xelatex") return "xelatex";
    if (lower === "lualatex") return "lualatex";
    if (lower === "pdflatex") return "pdflatex";
    return null;
  }

  let m;
  TEX_PROGRAM_RE.lastIndex = 0;
  while ((m = TEX_PROGRAM_RE.exec(content)) !== null) {
    const engine = normalizeEngineFromDirective(m[1]);
    if (engine) return engine;
  }

  const luaOnly =
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*luacode\s*\}/i.test(content) ||
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*luatexbase\s*\}/i.test(content) ||
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*luaotfload\s*\}/i.test(content) ||
    /\\directlua\s*\{/.test(content) ||
    /\\luacode\s*\{/.test(content);
  if (luaOnly) return "lualatex";

  const needsUnicode =
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*fontspec\s*\}/i.test(content) ||
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*unicode-math\s*\}/i.test(content) ||
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*polyglossia\s*\}/i.test(content);
  if (needsUnicode) return "xelatex";

  return "pdflatex";
}

module.exports = { detectEngine };
