import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompileResult } from "@/services/compile-service";
import type { LatexEngine } from "@/lib/latex-engine";

// Scripted compiler: each engine returns a canned result.
const script = new Map<LatexEngine, CompileResult>();
const calls: LatexEngine[] = [];
vi.mock("@/services/compile-service", () => ({
  compileLatex: vi.fn(async (_content: string, engine: LatexEngine) => {
    calls.push(engine);
    return script.get(engine)!;
  }),
}));
const { compileSmart } = await import("./smart-compile");

const pdf = (engine: LatexEngine, errors: string[] = []): CompileResult => ({
  ok: true,
  pdf: Buffer.from("%PDF"),
  log: errors.join("\n"),
  engine,
  errors: errors.map((message) => ({ file: null, line: null, message })),
});
const fail = (engine: LatexEngine, log: string): CompileResult => ({ ok: false, code: "COMPILE_ERROR", message: "Compilation failed", log, engine, status: 422 });

const FONTSPEC_ON_PDF = "! Fatal Package fontspec Error: The fontspec package requires either XeTeX or LuaTeX.";
const PDF_PRIMITIVE_ON_XE = "./main.tex:9: Undefined control sequence.\nl.9 \\pdfgentounicode";
const plain = "\\documentclass{article}\\begin{document}x\\end{document}";
const withFontspec = "\\documentclass{article}\\usepackage{fontspec}\\begin{document}x\\end{document}";

beforeEach(() => {
  script.clear();
  calls.length = 0;
});

describe("compileSmart", () => {
  it("a clean first compile is one attempt", async () => {
    script.set("pdflatex", pdf("pdflatex"));
    const r = await compileSmart(plain);
    expect(calls).toEqual(["pdflatex"]);
    expect(r.ok && r.engine).toBe("pdflatex");
    expect(r.switchedFrom).toBeUndefined();
  });

  it("switches on an engine-mismatch signature and reports it", async () => {
    // The last good engine says pdflatex, but the document now uses fontspec.
    script.set("pdflatex", fail("pdflatex", FONTSPEC_ON_PDF));
    script.set("xelatex", pdf("xelatex"));
    const r = await compileSmart(withFontspec, { lastGood: "pdflatex" });
    expect(calls).toEqual(["pdflatex", "xelatex"]);
    expect(r.ok && r.engine).toBe("xelatex");
    expect(r.switchedFrom).toBe("pdflatex");
  });

  it("a PDF with engine-related errors is improved by switching", async () => {
    script.set("xelatex", pdf("xelatex", [PDF_PRIMITIVE_ON_XE]));
    script.set("pdflatex", pdf("pdflatex"));
    const r = await compileSmart(`% !TEX program = xelatex\n${plain}`);
    expect(calls).toEqual(["xelatex", "pdflatex"]);
    expect(r.ok && r.errors.length).toBe(0);
  });

  it("a PDF with ordinary errors doesn't try other engines", async () => {
    script.set("pdflatex", pdf("pdflatex", ["Undefined control sequence. \\textbff"]));
    const r = await compileSmart(plain);
    expect(calls).toEqual(["pdflatex"]);
    expect(r.ok && r.errors.length).toBe(1);
  });

  it("no PDF and no signature: tries the remaining engines, keeps the best", async () => {
    script.set("pdflatex", fail("pdflatex", "! Emergency stop."));
    script.set("xelatex", pdf("xelatex", ["some error"]));
    script.set("lualatex", fail("lualatex", "! Emergency stop."));
    const r = await compileSmart(plain);
    expect(calls).toEqual(["pdflatex", "xelatex", "lualatex"]);
    expect(r.ok && r.engine).toBe("xelatex");
  });

  it("a forced compiler is used as-is", async () => {
    script.set("lualatex", fail("lualatex", FONTSPEC_ON_PDF));
    const r = await compileSmart(plain, { forced: "lualatex" });
    expect(calls).toEqual(["lualatex"]);
    expect(r.ok).toBe(false);
  });

  it("service problems don't trigger retries", async () => {
    script.set("pdflatex", { ok: false, code: "COMPILE_BUSY", message: "busy", status: 503 });
    const r = await compileSmart(plain);
    expect(calls).toEqual(["pdflatex"]);
    expect(!r.ok && r.code).toBe("COMPILE_BUSY");
  });
});
