import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { spawn } from "child_process";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { MAX_CONTENT_SIZE, COMPILE_TIMEOUT_MS } from "@/lib/constants";

type Engine = "pdflatex" | "xelatex" | "lualatex";

/** Normalized TeX program directive: % !TEX program = <engine> (case-insensitive, flexible spacing) */
const TEX_PROGRAM_RE =
  /%\s*!TEX\s+program\s*=\s*(\w+)/gi;

function normalizeEngineFromDirective(match: string): Engine | null {
  const lower = match.toLowerCase();
  if (lower === "xelatex") return "xelatex";
  if (lower === "lualatex") return "lualatex";
  if (lower === "pdflatex") return "pdflatex";
  return null;
}

const CompileRequestSchema = z.object({
  projectId: z.string(),
  content: z.string().max(MAX_CONTENT_SIZE),
  engine: z.enum(["pdflatex", "xelatex", "lualatex"]).optional(),
});

function detectEngine(content: string): Engine {
  // 1. Explicit TeX program directive (Overleaf-style) — highest priority
  let m: RegExpExecArray | null;
  TEX_PROGRAM_RE.lastIndex = 0;
  while ((m = TEX_PROGRAM_RE.exec(content)) !== null) {
    const engine = normalizeEngineFromDirective(m[1]);
    if (engine) return engine;
  }

  // 2. LuaTeX-only: these require lualatex (not xelatex)
  const luaOnly =
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*luacode\s*\}/i.test(content) ||
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*luatexbase\s*\}/i.test(content) ||
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*luaotfload\s*\}/i.test(content) ||
    /\\directlua\s*\{/.test(content) ||
    /\\luacode\s*\{/.test(content);
  if (luaOnly) return "lualatex";

  // 3. Unicode engines: fontspec / unicode-math / polyglossia need xelatex or lualatex
  const needsUnicode =
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*fontspec\s*\}/i.test(content) ||
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*unicode-math\s*\}/i.test(content) ||
    /\\(?:usepackage|RequirePackage)(\s*\[[^\]]*\])?\s*\{\s*polyglossia\s*\}/i.test(content);
  if (needsUnicode) return "xelatex";

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
