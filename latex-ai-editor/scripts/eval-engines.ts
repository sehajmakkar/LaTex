/**
 * Engine-selection eval: old approach (one guessed engine, stop on the first
 * error) vs the new one (analysis + last-good + signature fallback, compile
 * despite errors) on every template plus hard cases.
 *
 *   LATEX_SERVICE_URL=… LATEX_API_SECRET=… npx tsx --env-file=.env --tsconfig tsconfig.json scripts/eval-engines.ts
 *
 * Needs a compile service with the "compile despite errors" mode for the new
 * approach's full benefit.
 */
import { compileLatex } from "@/services/compile-service";
import { compileSmart } from "@/services/compile/smart-compile";
import { DEFAULT_LATEX_CONTENT } from "@/lib/constants";
import type { LatexEngine } from "@/lib/latex-engine";
import { getTemplateById, getTemplateIds, getTemplateManifests, substituteVariables } from "@/templates";

/** The detection this replaced: magic comment, else lua/fontspec package checks (comments included), else pdflatex. */
function oldDetect(content: string): LatexEngine {
  const m = /%\s*!TEX\s+program\s*=\s*(\w+)/i.exec(content);
  const d = m?.[1].toLowerCase();
  if (d === "xelatex" || d === "lualatex" || d === "pdflatex") return d;
  const p = (n: string) => new RegExp(`\\\\(?:usepackage|RequirePackage)(\\s*\\[[^\\]]*\\])?\\s*\\{\\s*${n}\\s*\\}`, "i").test(content);
  if (p("luacode") || p("luatexbase") || p("luaotfload") || /\\directlua\s*\{/.test(content)) return "lualatex";
  if (p("fontspec") || p("unicode-math") || p("polyglossia")) return "xelatex";
  return "pdflatex";
}

const art = (preamble: string, body: string) => `\\documentclass{article}\n${preamble}\n\\begin{document}\n${body}\n\\end{document}\n`;
const jakes = DEFAULT_LATEX_CONTENT;

type Case = { name: string; content: string; lastGood?: LatexEngine; expect: "clean" | "pdf" | "fail" };

function cases(): Case[] {
  const catalogIds = new Set(getTemplateManifests().map((m) => m.id));
  const templates: Case[] = getTemplateIds().map((id) => {
    const t = getTemplateById(id)!;
    const content = substituteVariables(t.content, Object.fromEntries(t.variables.map((v) => [v.key, v.placeholder || "Sample"])));
    return { name: `${catalogIds.has(id) ? "catalog" : "legacy"}:${id}`, content, expect: "clean" as const };
  });
  const awesome = getTemplateById("awesome-cv-resume")!.content;
  return [
    { name: "default resume", content: jakes, expect: "clean" },
    ...templates,
    // Hard cases
    { name: "wrong directive (pdflatex) + fontspec", content: `% !TEX program = pdflatex\n${art("\\usepackage{fontspec}\n\\setmainfont{Latin Modern Roman}", "Hello")}`, expect: "clean" },
    { name: "stale last engine: Awesome CV remembered as pdflatex", content: awesome, lastGood: "pdflatex", expect: "clean" },
    { name: "stale last engine: Jake's remembered as xelatex", content: jakes, lastGood: "xelatex", expect: "clean" },
    { name: "typo (\\textbff) in Jake's", content: jakes.replace("\\textbf{\\Huge", "\\textbff{\\Huge"), expect: "pdf" },
    { name: "misspelled environment", content: jakes.replace("\\resumeItemListStart\n        \\resumeItem{Developed a REST", "\\begin{itemze}\\item x\\end{itemze}\\resumeItemListStart\n        \\resumeItem{Developed a REST"), expect: "pdf" },
    // pdfLaTeX can't typeset these; XeLaTeX can (glyphs the font lacks are skipped with a warning).
    { name: "Unicode arrow and emoji in pdfLaTeX text", content: art("", "Improved latency → 40\\% faster ✓"), expect: "clean" },
    { name: "Chinese text, no CJK setup", content: art("", "简历 Resume"), expect: "clean" },
    { name: "Lua code", content: art("\\usepackage{luacode}", "Answer: \\directlua{tex.print(6*7)}"), expect: "clean" },
    { name: "fontspec only inside \\iffalse (dead code)", content: art("\\iffalse\\usepackage{fontspec}\\fi", "Hello"), expect: "clean" },
    { name: "commented-out fontspec + pdfTeX primitive", content: art("% \\usepackage{fontspec}\n\\pdfgentounicode=1", "Hello"), expect: "clean" },
    { name: "truly broken (missing \\end{document})", content: "\\documentclass{article}\n\\begin{document}\nHello\n", expect: "fail" },
  ];
}

const outcome = (r: { ok: boolean; errors?: unknown[] }) => (!r.ok ? "fail" : (r.errors?.length ?? 0) === 0 ? "clean" : "pdf");

async function main() {
  const rows: string[] = [];
  let oldOk = 0;
  let newOk = 0;
  let oldPdf = 0;
  let newPdf = 0;
  let asExpected = 0;
  const all = cases();
  for (const c of all) {
    const oldEngine = oldDetect(c.content);
    const old = await compileLatex(c.content, c.lastGood ?? oldEngine, { stopOnFirstError: true });
    const neu = await compileSmart(c.content, { lastGood: c.lastGood });
    const o = outcome(old);
    const n = outcome(neu);
    if (o === "clean") oldOk++;
    if (n === "clean") newOk++;
    if (o !== "fail") oldPdf++;
    if (n !== "fail") newPdf++;
    if (n === c.expect) asExpected++;
    const path = neu.attempts.map((a) => `${a.engine}${a.ok ? (a.errors ? `(${a.errors} err)` : "✓") : "✗"}`).join(" → ");
    rows.push(`${n === c.expect ? "PASS" : "FAIL"} ${c.name.padEnd(48)} old: ${(c.lastGood ?? oldEngine).padEnd(8)} ${o.padEnd(5)}  new: ${n.padEnd(5)} ${path}`);
    console.log(rows[rows.length - 1]);
  }
  console.log(
    `\n${all.length} documents. Clean PDF: old ${oldOk}, new ${newOk}. Any PDF: old ${oldPdf}, new ${newPdf}. New matches expectation: ${asExpected}/${all.length}.`
  );
}

main();
