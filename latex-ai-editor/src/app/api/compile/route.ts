import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { spawn } from "child_process";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { MAX_CONTENT_SIZE, COMPILE_TIMEOUT_MS } from "@/lib/constants";

const CompileRequestSchema = z.object({
  projectId: z.string(),
  content: z.string().max(MAX_CONTENT_SIZE),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CompileRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const { content } = parsed.data;
    const jobId = randomUUID();
    const workDir = join(tmpdir(), "latex-compile", jobId);

    await mkdir(workDir, { recursive: true });

    const texFile = join(workDir, "main.tex");
    await writeFile(texFile, content, "utf-8");

    const result = await compileLatex(workDir, "main.tex");

    if (!result.success) {
      return NextResponse.json(
        { error: { code: "COMPILE_ERROR", message: "Compilation failed", details: { log: result.log } } },
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
      },
    });
  } catch (error) {
    console.error("Compile error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

type CompileResult = {
  success: boolean;
  log: string;
};

async function compileLatex(workDir: string, filename: string): Promise<CompileResult> {
  return new Promise((resolve) => {
    const args = [
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-output-directory=" + workDir,
      filename,
    ];

    const proc = spawn("pdflatex", args, {
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
        log: `Failed to start pdflatex: ${error.message}. Make sure LaTeX is installed.`,
      });
    });
  });
}
