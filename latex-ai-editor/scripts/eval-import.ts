/**
 * Eval for resume import against real services.
 *
 * AI path: several templates are compiled to PDF (standing in for a user's
 * existing resume), plus any extra PDF/DOCX files given. Each is read by the AI,
 * rendered to LaTeX, compiled, and scored on coverage (share of the file's lines
 * that made it in) and unverified strings (text not in the file).
 * LaTeX path: each .zip/.tex given is imported as-is and compiled.
 *
 *   npx tsx --env-file=.env --tsconfig tsconfig.json scripts/eval-import.ts [files…]
 *
 * Calls Gemini and the compile service; costs a few cents.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { compileLatex } from "@/services/compile-service";
import { DEFAULT_LATEX_CONTENT } from "@/lib/constants";
import { getTemplateById, substituteVariables } from "@/templates";
import { extractDocx, extractPdf } from "@/services/ats/extract";
import { importWithAI } from "@/services/import/ai-import";
import { renderResume } from "@/services/import/render";
import { importTexFile, importZip } from "@/services/import/latex-import";
import { compileSmart } from "@/services/compile/smart-compile";

const TEMPLATES = ["modern-tech", "chicago", "technical", "academic", "project-highlights"];

function templatePdfSource(id: string) {
  const t = getTemplateById(id)!;
  return substituteVariables(t.content, Object.fromEntries(t.variables.map((v) => [v.key, v.placeholder || "Sample"])));
}

async function aiCase(name: string, file: Buffer, type: "pdf" | "docx") {
  const t0 = Date.now();
  const extraction = type === "pdf" ? await extractPdf(file) : await extractDocx(file);
  const scanned = type === "pdf" && !extraction.layout.hasTextLayer;
  try {
    const r = await importWithAI({ pdf: type === "pdf" ? file : undefined, text: extraction.text, scanned });
    const ms = Date.now() - t0;
    const latex = renderResume(r.data);
    const compiled = await compileLatex(latex);
    const c = r.check;
    const ok = compiled.ok && (!c || (c.coverage >= 0.95 && c.unverified.length === 0));
    console.log(
      `${ok ? "PASS" : "FAIL"} ai    ${name.padEnd(22)} compiled=${compiled.ok} coverage=${c ? (c.coverage * 100).toFixed(1) + "%" : "n/a"} ` +
        `unverified=${c?.unverified.length ?? "n/a"} missed=${c?.missed.length ?? "n/a"} sections=${r.data.sections.length} a=${r.attempts} ${ms}ms ` +
        `tokens=${r.usage.input}/${r.usage.output}/${r.usage.thinking}`
    );
    if (c?.unverified.length) console.log(`      unverified: ${c.unverified.slice(0, 5).map((u) => JSON.stringify(u.text.slice(0, 80))).join(" | ")}`);
    if (c?.missed.length) console.log(`      missed: ${c.missed.slice(0, 6).map((m) => JSON.stringify(m.slice(0, 80))).join(" | ")}`);
    if (!compiled.ok) console.log(`      compile: ${compiled.message} ${(compiled.log ?? "").split("\n").find((l) => l.startsWith("!")) ?? ""}`);
    return ok;
  } catch (e) {
    console.log(`FAIL ai    ${name.padEnd(22)} ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

async function latexCase(path: string) {
  const buffer = readFileSync(path);
  try {
    const r = path.endsWith(".zip") ? await importZip(buffer) : importTexFile(buffer, basename(path));
    const compiled = await compileSmart(r.content);
    console.log(
      `${compiled.ok ? "PASS" : "FAIL"} latex ${basename(path).padEnd(22)} main=${r.mainFile} embedded=[${r.embedded.join(", ")}] compiled=${compiled.ok}` +
        (compiled.ok
          ? ` engine=${compiled.engine} pdf=${Math.round(compiled.pdf.length / 1024)}KB`
          : ` ${(compiled.log ?? compiled.message).split("\n").filter((l) => /^!|:\d+: /.test(l)).slice(0, 2).join(" ")}`)
    );
    if (r.warnings.length) console.log(`      warnings: ${r.warnings.join(" | ")}`);
    return compiled.ok;
  } catch (e) {
    console.log(`FAIL latex ${basename(path).padEnd(22)} ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

async function main() {
  const extra = process.argv.slice(2);
  const onlyExtra = extra.includes("--only");
  const results: boolean[] = [];

  if (!onlyExtra) {
    const sources = [{ name: "default (Jake's)", content: DEFAULT_LATEX_CONTENT }, ...TEMPLATES.map((id) => ({ name: id, content: templatePdfSource(id) }))];
    // One at a time: the compile service queues only a few jobs.
    const pdfs: ({ name: string; pdf: Buffer } | null)[] = [];
    for (const src of sources) {
      const c = await compileLatex(src.content);
      if (!c.ok) console.log(`skip ${src.name}: template didn't compile (${c.message})`);
      pdfs.push(c.ok ? { name: src.name, pdf: c.pdf } : null);
    }
    const jobs = pdfs.filter((p): p is { name: string; pdf: Buffer } => p !== null);
    for (let i = 0; i < jobs.length; i += 3) {
      results.push(...(await Promise.all(jobs.slice(i, i + 3).map((j) => aiCase(j.name, j.pdf, "pdf")))));
    }
  }
  for (const path of extra.filter((a) => !a.startsWith("--"))) {
    if (/\.(zip|tex)$/i.test(path)) results.push(await latexCase(path));
    else if (/\.pdf$/i.test(path)) results.push(await aiCase(basename(path), readFileSync(path), "pdf"));
    else if (/\.docx$/i.test(path)) results.push(await aiCase(basename(path), readFileSync(path), "docx"));
  }
  console.log(`\npassed=${results.filter(Boolean).length}/${results.length}`);
}

main();
