import { compileLatex, type CompileOptions, type CompileResult } from "@/services/compile-service";
import { engineCandidates, engineMismatch, type LatexEngine } from "@/lib/latex-engine";

export type SmartCompileOptions = CompileOptions & {
  /** A compiler chosen in the project settings: used as-is, no fallback. */
  forced?: LatexEngine | null;
  /** The engine that last compiled this project cleanly. */
  lastGood?: LatexEngine | null;
  /**
   * Total time for all attempts, retries included. Routes have 60 s on Vercel;
   * the default leaves room to send the PDF back.
   */
  budgetMs?: number;
  maxAttempts?: number;
};

export type Attempt = { engine: LatexEngine; ok: boolean; errors: number; ms: number };

export type SmartCompileResult = CompileResult & {
  attempts: Attempt[];
  /** Set when the result came from a different engine than the first choice. */
  switchedFrom?: LatexEngine;
};

/** Clean PDF > PDF with fewer errors > PDF > no PDF. */
function score(r: CompileResult): number {
  if (!r.ok) return -1;
  return r.errors.length === 0 ? 10_000 : 1_000 - r.errors.length;
}

/**
 * Compiles with the best engine for the document, and recovers when the
 * engine was wrong:
 *  - candidates: forced compiler, else directive > last good engine > analysis;
 *  - a clean PDF ends it; a service problem (busy, timeout) ends it;
 *  - otherwise the log is checked for engine-mismatch signatures and the
 *    suggested engines are tried; when no PDF came out at all, the remaining
 *    candidates are tried too;
 *  - the best result wins (clean > fewest errors > any PDF).
 */
export async function compileSmart(content: string, options: SmartCompileOptions = {}): Promise<SmartCompileResult> {
  const { forced, lastGood, budgetMs = 52_000, maxAttempts = 3, ...compileOptions } = options;
  const started = Date.now();
  const deadline = started + budgetMs;
  const candidates = forced ? [forced] : engineCandidates(content, lastGood);
  const attempts: Attempt[] = [];
  const queue: LatexEngine[] = [candidates[0]];
  let best: CompileResult | null = null;

  while (queue.length && attempts.length < maxAttempts) {
    const engine = queue.shift()!;
    const t0 = Date.now();
    const result = await compileLatex(content, engine, { ...compileOptions, deadline });
    attempts.push({ engine, ok: result.ok, errors: result.ok ? result.errors.length : -1, ms: Date.now() - t0 });
    if (!best || score(result) > score(best)) best = result;

    if (score(result) === 10_000 || forced) break;
    // Busy, timeout, unreachable: another engine won't help.
    if (!result.ok && result.code !== "COMPILE_ERROR") break;
    // Another attempt needs real time; don't start one that can't finish.
    if (deadline - Date.now() < 10_000) break;

    const tried = new Set(attempts.map((a) => a.engine));
    const suggested = engineMismatch(result.log ?? "", engine).filter((e) => !tried.has(e) && !queue.includes(e));
    queue.push(...suggested);
    // No PDF at all: also try the rest, in order. A PDF with ordinary errors: only switch on a signature.
    if (!result.ok) queue.push(...candidates.filter((e) => !tried.has(e) && !queue.includes(e)));
  }

  const first = attempts[0].engine;
  const winner = best!;
  return {
    ...winner,
    attempts,
    ...(winner.ok && winner.engine !== first ? { switchedFrom: first } : {}),
  } as SmartCompileResult;
}
