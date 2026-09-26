import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MAX_CONTENT_SIZE } from "@/lib/constants";
import { compileLatex } from "@/services/compile-service";

const CompileRequestSchema = z.object({
  projectId: z.string(),
  content: z.string().max(MAX_CONTENT_SIZE),
  engine: z.enum(["pdflatex", "xelatex", "lualatex"]).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = CompileRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }
  if (!parsed.data.content.trim()) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "The document is empty." } }, { status: 400 });
  }

  try {
    const result = await compileLatex(parsed.data.content, parsed.data.engine);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: {
            code: result.code,
            message: result.message,
            ...(result.code === "COMPILE_ERROR" ? { details: { log: result.log ?? "", engine: result.engine } } : {}),
          },
        },
        { status: result.status ?? 502 }
      );
    }
    return NextResponse.json({
      data: {
        pdfUrl: `data:application/pdf;base64,${result.pdf.toString("base64")}`,
        log: result.log,
        engine: result.engine,
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
