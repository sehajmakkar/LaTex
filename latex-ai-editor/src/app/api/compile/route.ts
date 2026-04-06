import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { spawn } from "child_process";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { MAX_CONTENT_SIZE, COMPILE_TIMEOUT_MS } from "@/lib/constants";
import { env } from "@/lib/env";
import { detectEngine, type LatexEngine } from "@/lib/latex-engine";

const CompileRequestSchema = z.object({
  projectId: z.string(),
  content: z.string().max(MAX_CONTENT_SIZE),
  engine: z.enum(["pdflatex", "xelatex", "lualatex"]).optional(),
});

const REMOTE_FETCH_BUFFER_MS = 15_000;

type CompileResult = {
  success: boolean;
  log: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CompileRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { content, engine: requestedEngine } = parsed.data;
    const engine: LatexEngine = requestedEngine ?? detectEngine(content);

    const serviceBase = env.LATEX_SERVICE_URL?.replace(/\/$/, "");
    if (serviceBase) {
      return compileViaRemoteService(serviceBase, content, engine);
    }

    return compileLocally(content, engine);
  } catch (error) {
    console.error("Compile error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

async function compileViaRemoteService(
  serviceBase: string,
  content: string,
  engine: LatexEngine
): Promise<NextResponse> {
  const url = `${serviceBase}/compile`;
  const controller = new AbortController();
  const timeoutMs = COMPILE_TIMEOUT_MS + REMOTE_FETCH_BUFFER_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (env.LATEX_API_SECRET) {
      headers["x-api-secret"] = env.LATEX_API_SECRET;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ content, engine }),
      signal: controller.signal,
    });

    const text = await response.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "COMPILE_SERVICE_ERROR",
            message: "LaTeX service returned an invalid response",
            details: { status: response.status },
          },
        },
        { status: 502 }
      );
    }

    if (response.status === 422 && json && typeof json === "object" && json !== null) {
      const o = json as Record<string, unknown>;
      const log = typeof o.log === "string" ? o.log : "";
      const eng = typeof o.engine === "string" ? o.engine : engine;
      return NextResponse.json(
        {
          error: {
            code: "COMPILE_ERROR",
            message: "Compilation failed",
            details: { log, engine: eng },
          },
        },
        { status: 422 }
      );
    }

    if (response.status === 401) {
      return NextResponse.json(
        {
          error: {
            code: "COMPILE_SERVICE_UNAUTHORIZED",
            message: "LaTeX service rejected the API secret",
          },
        },
        { status: 502 }
      );
    }

    if (!response.ok || !json || typeof json !== "object" || json === null) {
      return NextResponse.json(
        {
          error: {
            code: "COMPILE_SERVICE_ERROR",
            message: "LaTeX service request failed",
            details: { status: response.status },
          },
        },
        { status: 502 }
      );
    }

    const o = json as Record<string, unknown>;
    if (o.ok !== true || typeof o.pdf !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "COMPILE_SERVICE_ERROR",
            message: "LaTeX service returned an unexpected payload",
          },
        },
        { status: 502 }
      );
    }

    const log = typeof o.log === "string" ? o.log : "";
    const usedEngine = typeof o.engine === "string" ? o.engine : engine;
    const pdfUrl = `data:application/pdf;base64,${o.pdf}`;

    return NextResponse.json({
      data: {
        pdfUrl,
        log,
        engine: usedEngine,
      },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: {
          code: aborted ? "COMPILE_TIMEOUT" : "COMPILE_SERVICE_ERROR",
          message: aborted
            ? "LaTeX compilation timed out"
            : "Could not reach the LaTeX compilation service",
        },
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}

async function compileLocally(content: string, engine: LatexEngine): Promise<NextResponse> {
  const jobId = randomUUID();
  const workDir = join(tmpdir(), "latex-compile", jobId);

  await mkdir(workDir, { recursive: true });

  const texFile = join(workDir, "main.tex");
  await writeFile(texFile, content, "utf-8");

  const result = await compileLatex(workDir, "main.tex", engine);

  if (!result.success) {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
    return NextResponse.json(
      {
        error: {
          code: "COMPILE_ERROR",
          message: "Compilation failed",
          details: { log: result.log, engine },
        },
      },
      { status: 422 }
    );
  }

  const pdfPath = join(workDir, "main.pdf");
  const pdfBuffer = await readFile(pdfPath);
  const pdfBase64 = pdfBuffer.toString("base64");
  const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;

  await rm(workDir, { recursive: true, force: true }).catch(() => {});

  return NextResponse.json({
    data: {
      pdfUrl,
      log: result.log,
      engine,
    },
  });
}

async function compileLatex(
  workDir: string,
  filename: string,
  engine: LatexEngine
): Promise<CompileResult> {
  return new Promise((resolve) => {
    const args = [
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-output-directory=" + workDir,
      filename,
    ];

    const proc = spawn(engine, args, {
      cwd: workDir,
      timeout: COMPILE_TIMEOUT_MS,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      const log = stdout + "\n" + stderr;
      resolve({
        success: code === 0,
        log,
      });
    });

    proc.on("error", (error) => {
      resolve({
        success: false,
        log: `Failed to start ${engine}: ${error.message}. Make sure LaTeX is installed.`,
      });
    });
  });
}
