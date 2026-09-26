import { spawn } from "child_process";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { COMPILE_TIMEOUT_MS } from "@/lib/constants";
import { env } from "@/lib/env";
import { detectEngine, type LatexEngine } from "@/lib/latex-engine";

const REMOTE_FETCH_BUFFER_MS = 15_000;

export type CompileFailureCode =
  | "COMPILE_ERROR"
  | "COMPILE_TIMEOUT"
  | "COMPILE_SERVICE_ERROR"
  | "COMPILE_SERVICE_UNAUTHORIZED"
  | "COMPILE_BUSY";

export type CompileResult =
  | { ok: true; pdf: Buffer; log: string; engine: string }
  | { ok: false; code: CompileFailureCode; message: string; log?: string; engine?: string; status?: number };

/**
 * Compiles a LaTeX document to PDF: on the remote compile service when
 * LATEX_SERVICE_URL is set (production), otherwise with the local TeX install.
 */
export async function compileLatex(content: string, requestedEngine?: LatexEngine): Promise<CompileResult> {
  const engine = requestedEngine ?? detectEngine(content);
  const serviceBase = env.LATEX_SERVICE_URL?.replace(/\/$/, "");
  return serviceBase ? compileRemote(serviceBase, content, engine) : compileLocal(content, engine);
}

async function compileRemote(serviceBase: string, content: string, engine: LatexEngine): Promise<CompileResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COMPILE_TIMEOUT_MS + REMOTE_FETCH_BUFFER_MS);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (env.LATEX_API_SECRET) headers["x-api-secret"] = env.LATEX_API_SECRET;

    const response = await fetch(`${serviceBase}/compile`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content, engine }),
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (response.status === 422) {
      return {
        ok: false,
        code: "COMPILE_ERROR",
        message: "Compilation failed",
        log: typeof body?.log === "string" ? body.log : "",
        engine: typeof body?.engine === "string" ? body.engine : engine,
        status: 422,
      };
    }
    if (response.status === 401) {
      return { ok: false, code: "COMPILE_SERVICE_UNAUTHORIZED", message: "LaTeX service rejected the API secret", status: 502 };
    }
    if (response.status === 503) {
      return { ok: false, code: "COMPILE_BUSY", message: "The compiler is busy. Try again in a few seconds.", status: 503 };
    }
    if (!response.ok || body?.ok !== true || typeof body.pdf !== "string") {
      return {
        ok: false,
        code: "COMPILE_SERVICE_ERROR",
        message: "LaTeX service request failed",
        status: 502,
      };
    }
    return {
      ok: true,
      pdf: Buffer.from(body.pdf, "base64"),
      log: typeof body.log === "string" ? body.log : "",
      engine: typeof body.engine === "string" ? body.engine : engine,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      code: aborted ? "COMPILE_TIMEOUT" : "COMPILE_SERVICE_ERROR",
      message: aborted ? "LaTeX compilation timed out" : "Could not reach the LaTeX compilation service",
      status: aborted ? 504 : 502,
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
    return { ok: true, pdf: await readFile(join(workDir, "main.pdf")), log: result.log, engine };
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
