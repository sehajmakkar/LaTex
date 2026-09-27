import { spawn } from "child_process";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { COMPILE_TIMEOUT_MS } from "@/lib/constants";
import { env } from "@/lib/env";
import { detectEngine, type LatexEngine } from "@/lib/latex-engine";


export type CompileFailureCode =
  | "COMPILE_ERROR"
  | "COMPILE_TIMEOUT"
  | "COMPILE_SERVICE_ERROR"
  | "COMPILE_SERVICE_UNAUTHORIZED"
  | "COMPILE_BUSY"
  | "COMPILE_REJECTED";

export type CompileError = { file: string | null; line: number | null; message: string };

export type CompileResult =
  | {
      ok: true;
      pdf: Buffer;
      log: string;
      engine: LatexEngine;
      /** LaTeX errors the PDF was produced despite (empty = clean). */
      errors: CompileError[];
      /** First page as PNG, when asked for and supported. */
      thumbnail?: Buffer;
    }
  | { ok: false; code: CompileFailureCode; message: string; log?: string; engine?: LatexEngine; errors?: CompileError[]; status?: number };

export type CompileOptions = {
  thumbnail?: boolean;
  /**
   * Wall-clock deadline (epoch ms) for this call, retries included. Routes run
   * for at most 60 s on Vercel, so the caller sets one that leaves time to answer.
   */
  deadline?: number;
  /** Overleaf's "Stop on first error": no PDF when there's any error. Default: compile despite errors. */
  stopOnFirstError?: boolean;
};

function readErrors(value: unknown): CompileError[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object" && typeof (e as { message?: unknown }).message === "string")
    .map((e) => ({
      file: typeof e.file === "string" ? e.file : null,
      line: typeof e.line === "number" ? e.line : null,
      message: String(e.message),
    }));
}

/**
 * Compiles a LaTeX document to PDF: on the remote compile service when
 * LATEX_SERVICE_URL is set (production), otherwise with the local TeX install.
 */
export async function compileLatex(
  content: string,
  requestedEngine?: LatexEngine,
  options: CompileOptions = {}
): Promise<CompileResult> {
  const engine = requestedEngine ?? detectEngine(content);
  const serviceBase = env.LATEX_SERVICE_URL?.replace(/\/$/, "");
  return serviceBase ? compileRemote(serviceBase, content, engine, options) : compileLocal(content, engine);
}

/** Longest a single compile may run (the service is told the same, so it stops too). */
const MAX_COMPILE_MS = 45_000;
const MIN_USEFUL_MS = 8_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One automatic retry for transient problems: the compiler is busy (waits for
 * its Retry-After, at most 5 s) or waking up / unreachable (waits 2 s). Only
 * if the deadline leaves time for it. LaTeX errors and timeouts aren't retried.
 */
async function compileRemote(serviceBase: string, content: string, engine: LatexEngine, options: CompileOptions): Promise<CompileResult> {
  const deadline = options.deadline ?? Date.now() + MAX_COMPILE_MS + 5_000;
  const first = await compileRemoteOnce(serviceBase, content, engine, options, deadline);
  if (first.result.ok || !first.retryAfterMs) return first.result;
  if (deadline - Date.now() - first.retryAfterMs < MIN_USEFUL_MS) return first.result;
  await sleep(first.retryAfterMs);
  return (await compileRemoteOnce(serviceBase, content, engine, options, deadline)).result;
}

async function compileRemoteOnce(
  serviceBase: string,
  content: string,
  engine: LatexEngine,
  options: CompileOptions,
  deadline: number
): Promise<{ result: CompileResult; retryAfterMs?: number }> {
  // The service gets the time left (minus a margin to send the PDF back), and we abort a bit after it.
  const budget = Math.min(MAX_COMPILE_MS, deadline - Date.now() - 3_000);
  if (budget < 5_000) {
    return { result: { ok: false, code: "COMPILE_TIMEOUT", message: "Not enough time left to compile. Try again.", status: 504 } };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget + 2_500);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (env.LATEX_API_SECRET) headers["x-api-secret"] = env.LATEX_API_SECRET;

    const response = await fetch(`${serviceBase}/compile`, {
      method: "POST",
      headers,
      // Older services ignore the fields they don't know.
      body: JSON.stringify({
        content,
        engine,
        timeoutMs: budget,
        ...(options.thumbnail ? { thumbnail: true } : {}),
        ...(options.stopOnFirstError ? { stopOnFirstError: true } : {}),
      }),
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (response.status === 422) {
      const log = typeof body?.log === "string" ? body.log : "";
      const timedOut = body?.reason === "timeout";
      return {
        result: {
          ok: false,
          code: timedOut ? "COMPILE_TIMEOUT" : "COMPILE_ERROR",
          message: timedOut
            ? "Compiling took too long. Look for loops, very large tables, or heavy packages."
            : "Compilation failed",
          log,
          engine,
          errors: readErrors(body?.errors),
          status: timedOut ? 504 : 422,
        },
      };
    }
    if (response.status === 401) {
      return { result: { ok: false, code: "COMPILE_SERVICE_UNAUTHORIZED", message: "The compile service isn't set up correctly. Please try again later.", status: 502 } };
    }
    if (response.status === 503) {
      const retryAfter = Number(response.headers.get("retry-after"));
      return {
        result: { ok: false, code: "COMPILE_BUSY", message: "The compiler is busy with other documents. Try again in a few seconds.", status: 503 },
        retryAfterMs: Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 3_000, 5_000),
      };
    }
    if (response.status === 400 || response.status === 413) {
      return {
        result: {
          ok: false,
          code: "COMPILE_REJECTED",
          message: response.status === 413 ? "This document is too large to compile." : "The compiler rejected this document.",
          status: response.status,
        },
      };
    }
    if (!response.ok || body?.ok !== true || typeof body.pdf !== "string") {
      // 502/504 from the host usually means the service is starting up.
      return {
        result: { ok: false, code: "COMPILE_SERVICE_ERROR", message: "The compiler is starting up or unreachable. Try again in a few seconds.", status: 502 },
        retryAfterMs: response.status === 502 || response.status === 504 ? 2_000 : undefined,
      };
    }
    return {
      result: {
        ok: true,
        pdf: Buffer.from(body.pdf, "base64"),
        log: typeof body.log === "string" ? body.log : "",
        engine,
        // Older services stop on the first error, so a PDF from them is always clean.
        errors: readErrors(body.errors),
        thumbnail: typeof body.thumbnail === "string" ? Buffer.from(body.thumbnail, "base64") : undefined,
      },
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return aborted
      ? { result: { ok: false, code: "COMPILE_TIMEOUT", message: "Compiling took too long. Look for loops, very large tables, or heavy packages.", status: 504 } }
      : {
          // Network error: the service is asleep, restarting or unreachable.
          result: { ok: false, code: "COMPILE_SERVICE_ERROR", message: "The compiler is starting up or unreachable. Try again in a few seconds.", status: 502 },
          retryAfterMs: 2_000,
        };
  } finally {
    clearTimeout(timer);
  }
}

async function compileLocal(content: string, engine: LatexEngine): Promise<CompileResult> {
  const workDir = join(tmpdir(), "latex-compile", randomUUID());
  await mkdir(workDir, { recursive: true });
  try {
    await writeFile(join(workDir, "main.tex"), content, "utf-8");
    const result = await runEngine(workDir, "main.tex", engine);
    if (!result.success) {
      return { ok: false, code: "COMPILE_ERROR", message: "Compilation failed", log: result.log, engine, status: 422 };
    }
    return { ok: true, pdf: await readFile(join(workDir, "main.pdf")), log: result.log, engine, errors: [] };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function runEngine(workDir: string, filename: string, engine: LatexEngine): Promise<{ success: boolean; log: string }> {
  return new Promise((resolve) => {
    const proc = spawn(engine, ["-interaction=nonstopmode", "-halt-on-error", `-output-directory=${workDir}`, filename], {
      cwd: workDir,
      timeout: COMPILE_TIMEOUT_MS,
    });
    let output = "";
    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => (output += d.toString()));
    proc.on("close", (code) => resolve({ success: code === 0, log: output }));
    proc.on("error", (error) =>
      resolve({ success: false, log: `Failed to start ${engine}: ${error.message}. Make sure LaTeX is installed.` })
    );
  });
}
