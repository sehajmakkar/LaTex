import { describe, expect, it } from "vitest";
import { analyzeEngine, detectEngine, engineCandidates, engineDirective, engineMismatch } from "./latex-engine";

const doc = (preamble: string, body = "Hello") => `\\documentclass{article}\n${preamble}\n\\begin{document}\n${body}\n\\end{document}`;

describe("engineDirective", () => {
  it("reads Overleaf/TeXShop magic comments", () => {
    expect(engineDirective("% !TEX program = xelatex\n\\documentclass{article}")).toBe("xelatex");
    expect(engineDirective("%!TEX TS-program = lualatex\n")).toBe("lualatex");
    expect(engineDirective("% !TEX program = pdftex\n")).toBe("pdflatex");
    expect(engineDirective("text % !TEX program = xelatex")).toBeNull(); // must start the line
  });
});

describe("analyzeEngine", () => {
  it("defaults to pdfLaTeX, like Overleaf", () => {
    expect(analyzeEngine(doc("\\usepackage{geometry}")).candidates).toEqual(["pdflatex", "xelatex", "lualatex"]);
  });
  it("ignores commented-out packages", () => {
    expect(detectEngine(doc("% \\usepackage{fontspec}"))).toBe("pdflatex");
  });
  it("fontspec and friends → XeLaTeX, then LuaLaTeX", () => {
    expect(analyzeEngine(doc("\\usepackage[no-math]{fontspec}")).candidates).toEqual(["xelatex", "lualatex", "pdflatex"]);
    expect(detectEngine(doc("\\RequirePackage{unicode-math}"))).toBe("xelatex");
    expect(detectEngine(doc("\\setmainfont{Roboto}"))).toBe("xelatex");
    expect(detectEngine("\\documentclass{ctexart}\n\\begin{document}\\end{document}")).toBe("xelatex");
  });
  it("fontspec plus pdfTeX primitives (guarded templates) → XeLaTeX, then pdfLaTeX", () => {
    expect(analyzeEngine(doc("\\usepackage{fontspec}\n\\pdfgentounicode=1")).candidates).toEqual(["xelatex", "pdflatex", "lualatex"]);
  });
  it("Lua code → LuaLaTeX; XeTeX-only packages → XeLaTeX", () => {
    expect(detectEngine(doc("\\usepackage{luacode}"))).toBe("lualatex");
    expect(detectEngine(doc("", "\\directlua{tex.print('x')}"))).toBe("lualatex");
    expect(detectEngine(doc("\\usepackage{xeCJK}"))).toBe("xelatex");
  });
  it("non-Latin script → XeLaTeX unless pdfLaTeX CJK support is loaded", () => {
    expect(detectEngine(doc("", "简历 Résumé"))).toBe("xelatex");
    expect(detectEngine(doc("\\usepackage{CJKutf8}", "简历"))).toBe("pdflatex");
    expect(detectEngine(doc("", "Résumé naïve café"))).toBe("pdflatex"); // accented Latin is fine
  });
  it("Jake's Resume (glyphtounicode) stays on pdfLaTeX", () => {
    expect(detectEngine(doc("\\input{glyphtounicode}\n\\pdfgentounicode=1"))).toBe("pdflatex");
  });
});

describe("engineCandidates", () => {
  it("directive > last good engine > analysis, always all three", () => {
    const d = doc("\\usepackage{fontspec}");
    expect(engineCandidates(d)).toEqual(["xelatex", "lualatex", "pdflatex"]);
    expect(engineCandidates(d, "lualatex")).toEqual(["lualatex", "xelatex", "pdflatex"]);
    expect(engineCandidates(`% !TEX program = pdflatex\n${d}`, "lualatex")).toEqual(["pdflatex", "lualatex", "xelatex"]);
  });
});

describe("engineMismatch", () => {
  it("pdfLaTeX hitting fontspec → XeLaTeX, LuaLaTeX", () => {
    const log = "! Fatal Package fontspec Error: The fontspec package requires either XeTeX or\n(fontspec)                      LuaTeX.";
    expect(engineMismatch(log, "pdflatex")).toEqual(["xelatex", "lualatex"]);
  });
  it("pdfLaTeX and Unicode characters → Unicode engines", () => {
    expect(engineMismatch("! Package inputenc Error: Unicode character 简 (U+7B80)\n(inputenc)                not set up for use with LaTeX.", "pdflatex")).toEqual(["xelatex", "lualatex"]);
  });
  it("current LaTeX's wording of the Unicode error counts too", () => {
    expect(engineMismatch("./main.tex:4: LaTeX Error: Unicode character → (U+2192)\n               not set up for use with LaTeX.", "pdflatex")).toEqual(["xelatex", "lualatex"]);
  });
  it("XeLaTeX hitting pdfTeX primitives → pdfLaTeX", () => {
    const log = "./main.tex:40: Undefined control sequence.\nl.40 \\pdfgentounicode\n                     =1";
    expect(engineMismatch(log, "xelatex")).toEqual(["pdflatex", "lualatex"]);
  });
  it("Lua code outside LuaTeX → LuaLaTeX", () => {
    expect(engineMismatch("! Undefined control sequence.\nl.5 \\directlua\n{tex.print(1)}", "pdflatex")).toEqual(["lualatex"]);
    expect(engineMismatch("! Package luacode Error: LuaTeX is required.", "xelatex")).toEqual(["lualatex"]);
  });
  it("a missing font on XeLaTeX → try LuaLaTeX", () => {
    expect(engineMismatch('! Package fontspec Error: The font "Lato-Lig" cannot be found.', "xelatex")).toEqual(["lualatex"]);
  });
  it("ordinary mistakes don't switch engines", () => {
    expect(engineMismatch("./main.tex:12: Undefined control sequence.\nl.12 \\textbff", "pdflatex")).toEqual([]);
    expect(engineMismatch("! LaTeX Error: Environment itemze undefined.", "xelatex")).toEqual([]);
  });
});
