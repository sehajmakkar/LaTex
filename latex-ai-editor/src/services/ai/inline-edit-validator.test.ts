import { describe, expect, it } from "vitest";
import { scanLatex, stripFences, validateInlineEdit } from "./inline-edit-validator";

const item = String.raw`\resumeItem{Developed a REST API using FastAPI and PostgreSQL}`;
const check = (output: string, selection = item, instruction = "make it concise", context = "") =>
  validateInlineEdit({ output, selection, instruction, context });

describe("stripFences", () => {
  it("removes markdown fences", () => {
    expect(stripFences("```latex\n\\textbf{x}\n```")).toBe("\\textbf{x}");
  });
});

describe("scanLatex", () => {
  it("ignores escaped characters and comments", () => {
    const s = scanLatex(String.raw`a \{ \% \& b % comment { & #` + "\n}");
    expect(s.braceDelta).toBe(-1);
    expect(s.unescaped["%"]).toBe(1);
    expect(s.unescaped["&"]).toBe(0);
  });
  it("treats \\\\ as a line break, so \\\\input is plain text but \\\\\\input is a command", () => {
    expect(scanLatex(String.raw`one\\input two`).commands.get("input")).toBeUndefined();
    expect(scanLatex(String.raw`one\\\input two`).commands.get("input")).toBe(1);
  });
});

describe("validateInlineEdit", () => {
  it("accepts a clean rewrite", () => {
    const r = check(String.raw`\resumeItem{Built a FastAPI and PostgreSQL REST API}`);
    expect(r).toEqual({ ok: true, replacement: String.raw`\resumeItem{Built a FastAPI and PostgreSQL REST API}` });
  });

  it("strips code fences before validating", () => {
    const r = check("```latex\n" + String.raw`\resumeItem{Built an API}` + "\n```");
    expect(r.ok && r.replacement).toBe(String.raw`\resumeItem{Built an API}`);
  });

  it("rejects an empty edit unless deletion was asked for", () => {
    expect(check("").ok).toBe(false);
    expect(check("", item, "delete this bullet").ok).toBe(true);
  });

  it("rejects unbalanced braces and dropped wrappers that unbalance", () => {
    expect(check(String.raw`\resumeItem{Built an API`).ok).toBe(false);
  });

  it("rejects unmatched environments", () => {
    const sel = "\\begin{itemize}\n\\item A\n\\end{itemize}";
    expect(check("\\begin{itemize}\n\\item A", sel).ok).toBe(false);
    expect(check("\\begin{itemize}\n\\item B\n\\end{itemize}", sel).ok).toBe(true);
  });

  it.each(["\\input{/etc/passwd}", "\\immediate\\write18{rm -rf /}", "\\directlua{os.execute('id')}", "\\csname input\\endcsname{x}", "^^5cinput{x}", "\\catcode`\\@=11"])(
    "rejects dangerous TeX: %s",
    (bad) => {
      expect(check(String.raw`\resumeItem{Built an API} ` + bad).ok).toBe(false);
    }
  );

  it("allows a dangerous command that was already in the selection", () => {
    const sel = "\\input{sections/experience}";
    expect(check("\\input{sections/experience}", sel, "keep as is").ok).toBe(true);
  });

  it("rejects \\usepackage and \\begin{document} unless asked", () => {
    expect(check(String.raw`\usepackage{xcolor}\resumeItem{Built an API}`).ok).toBe(false);
    expect(check(String.raw`\usepackage{xcolor}\resumeItem{Built an API}`, item, "add the xcolor package").ok).toBe(true);
    expect(check("\\begin{document}x\\end{document}", "x", "shorten").ok).toBe(false);
  });

  it("rejects unescaped % and &", () => {
    expect(check(String.raw`\resumeItem{Cut latency by 35% with caching}`, item, "cut latency by 35").ok).toBe(false);
    expect(check(String.raw`\resumeItem{Cut latency by 35\% with caching}`, item, "cut latency by 35").ok).toBe(true);
    expect(check(String.raw`\resumeItem{APIs & caching}`).ok).toBe(false);
    expect(check(String.raw`\resumeItem{APIs \& caching}`).ok).toBe(true);
  });

  it("rejects invented numbers but allows ones from the selection, instruction or context", () => {
    expect(check(String.raw`\resumeItem{Built an API serving 100,000 users}`, item, "add a metric").ok).toBe(false);
    expect(check(String.raw`\resumeItem{Built an API serving [N] users}`, item, "add a metric").ok).toBe(true);
    expect(check(String.raw`\resumeItem{Built an API serving 5,000 users}`, item, "mention it served 5000 users").ok).toBe(true);
    expect(check(String.raw`\resumeItem{Built an API (2021)}`, item, "add the year", "June 2020 -- 2021").ok).toBe(true);
  });

  it("rejects output far larger than the selection", () => {
    expect(check(String.raw`\resumeItem{` + "x".repeat(5000) + "}").ok).toBe(false);
  });
});

describe("layout numbers", () => {
  it("allows new lengths but not new facts", () => {
    const ok = validateInlineEdit({
      output: String.raw`\vspace{-4pt}\setlength{\itemsep}{0.5em}\linespread{0.95}\includegraphics[width=0.8\textwidth]{}`,
      selection: String.raw`\vspace{-2pt}\setlength{\itemsep}{1em}\linespread{1}\includegraphics[width=\textwidth]{}`,
      instruction: "tighten spacing",
    });
    expect(ok.ok).toBe(true);
    const bad = validateInlineEdit({ output: "Led a team of 12 in 3 cities", selection: "Led a team", instruction: "improve" });
    expect(bad.ok).toBe(false);
  });
});
