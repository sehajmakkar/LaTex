import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { spawn } from "child_process";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { MAX_CONTENT_SIZE, COMPILE_TIMEOUT_MS } from "@/lib/constants";

type Engine = "pdflatex" | "xelatex" | "lualatex";

const CompileRequestSchema = z.object({
  projectId: z.string(),
  content: z.string().max(MAX_CONTENT_SIZE),
  engine: z.enum(["pdflatex", "xelatex", "lualatex"]).optional(),
});

function detectEngine(content: string): Engine {
  // Explicit TeX program directive (Overleaf-style comments)
  if (content.includes("% !TEX program = xelatex")) return "xelatex";
  if (content.includes("% !TEX program = lualatex")) return "lualatex";
  if (content.includes("% !TEX program = pdflatex")) return "pdflatex";

  // fontspec requires xelatex or lualatex — default to xelatex
  if (content.includes("\\usepackage{fontspec}")) return "xelatex";

  // luacode or luatexbase are lualatex-specific
  if (
    content.includes("\\usepackage{luacode}") ||
    content.includes("\\usepackage{luatexbase}")
  )
    return "lualatex";

  // unicode-math works with both but is most common with xelatex
  if (content.includes("\\usepackage{unicode-math}")) return "xelatex";

  return "pdflatex";
}

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

    // Use explicitly requested engine, otherwise auto-detect from content
    const engine: Engine = requestedEngine ?? detectEngine(content);

    const jobId = randomUUID();
    const workDir = join(tmpdir(), "latex-compile", jobId);

    await mkdir(workDir, { recursive: true });

    const texFile = join(workDir, "main.tex");
    await writeFile(texFile, content, "utf-8");

    const result = await compileLatex(workDir, "main.tex", engine);

    if (!result.success) {
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
        engine, // useful for the client to know which engine was used
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

async function compileLatex(
  workDir: string,
  filename: string,
  engine: Engine
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