/**
 * Picks an engine when a request doesn't name one. The app always names one
 * (see src/lib/latex-engine.ts and services/compile/smart-compile.ts, which
 * also fall back between engines); keep this in sync with `analyzeEngine`
 * and `engineDirective` there.
 * @param {string} content
 * @returns {"pdflatex"|"xelatex"|"lualatex"}
 */
function detectEngine(content) {
  const toEngine = (token) => {
    const t = String(token).toLowerCase();
    if (t === "pdflatex" || t === "pdftex") return "pdflatex";
    if (t === "xelatex" || t === "xetex") return "xelatex";
    if (t === "lualatex" || t === "luatex") return "lualatex";
    return null;
  };
  const directive = /^\s*%\s*!\s*TEX\s+(?:TS-)?program\s*=\s*([A-Za-z]+)/gim;
  for (let m = directive.exec(content); m; m = directive.exec(content)) {
    const engine = toEngine(m[1]);
    if (engine) return engine;
  }

  // Code only: a commented-out \usepackage doesn't count.
  const code = content
    .split("\n")
    .map((line) => {
      for (let i = 0; i < line.length; i++) if (line[i] === "%" && line[i - 1] !== "\\") return line.slice(0, i);
      return line;
    })
    .join("\n");
  const pkg = (names) => new RegExp(`\\\\(?:usepackage|RequirePackage)\\s*(?:\\[[^\\]]*\\])?\\s*\\{[^}]*\\b(?:${names})\\b[^}]*\\}`);
  const has = (list) => list.some((re) => re.test(code));

  const lua = has([
    pkg("luacode|luatexbase|luaotfload|luatextra|luamplib|lua-visual-debug|luacolor|lualatex-math|selnolig|lua-ul"),
    /\\(?:directlua|luaexec|luadirect)\s*\{/,
    /\\begin\s*\{luacode\*?\}/,
  ]);
  const xe = has([pkg("xeCJK|xltxtra|xunicode|xetexko|zhspacing|mathspec|xeindex|xecolor"), /\\XeTeX[a-zA-Z]+/]);
  const unicode = has([
    pkg("fontspec|unicode-math|polyglossia"),
    /\\(?:setmainfont|setsansfont|setmonofont|newfontfamily|defaultfontfeatures|setmathfont)\b/,
    /\\documentclass\s*(?:\[[^\]]*\])?\s*\{ctex(?:art|rep|book|beamer)\}/,
  ]);
  const pdf = has([/\\pdf(?:gentounicode|glyphtounicode|minorversion|compresslevel|objcompresslevel)\b/, /\\input\s*\{?\s*glyphtounicode/, /\\pdfoutput\s*=/]);
  const nonLatin =
    /[֐-ࣿऀ-෿฀-๿ᄀ-ᇿ　-鿿가-힯豈-﫿]/.test(code) && !has([pkg("CJKutf8|CJK")]);

  if (lua) return "lualatex";
  if (xe || unicode) return "xelatex";
  if (nonLatin && !pdf) return "xelatex";
  return "pdflatex";
}

module.exports = { detectEngine };
