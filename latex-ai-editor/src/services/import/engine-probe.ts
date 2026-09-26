import { compileLatex } from "@/services/compile-service";
import { detectEngine, type LatexEngine } from "@/lib/latex-engine";

export type ProbeResult =
  | { ok: true; content: string; engine: LatexEngine; pdf: Buffer }
  | { ok: false; content: string; code: string; message: string; log?: string };

/**
 * Overleaf keeps the compiler in project settings, not in the source, so our
 * guess can be wrong for an imported project. Compile with the detected engine
 * and, if that fails with a LaTeX error, try the others. The one that works is
 * pinned with a `% !TEX program` comment so the editor keeps using it.
 */
export async function compileWithEngineProbe(content: string): Promise<ProbeResult> {
  const detected = detectEngine(content);
  const order: LatexEngine[] = [detected, ...(["pdflatex", "xelatex", "lualatex"] as const).filter((e) => e !== detected)];
  let first: ProbeResult | null = null;
  for (const engine of order) {
    const result = await compileLatex(content, engine);
    if (result.ok) {
      const pinned = engine === detected ? content : `% !TEX program = ${engine}\n${content}`;
      return { ok: true, content: pinned, engine, pdf: result.pdf };
    }
    first ??= { ok: false, content, code: result.code, message: result.message, log: result.log };
    // Only a LaTeX error is worth another engine; a busy or broken service isn't.
    if (result.code !== "COMPILE_ERROR") break;
  }
  return first!;
}
