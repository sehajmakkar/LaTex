import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { MAX_CONTENT_SIZE } from "@/lib/constants";
import { compileLatex } from "@/services/compile-service";
import { projectRepository } from "@/repositories/project-repository";
import { thumbnailService } from "@/services/thumbnail-service";

const CompileRequestSchema = z.object({
  projectId: z.string(),
  content: z.string().max(MAX_CONTENT_SIZE),
  engine: z.enum(["pdflatex", "xelatex", "lualatex"]).optional(),
  /** Update the dashboard thumbnail (false for previews of unsaved AI changes). */
  thumbnail: z.boolean().optional().default(true),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // Thumbnails only for the signed-in owner's project; the ownership check runs alongside the compile.
  const { userId } = await auth();
  const { projectId } = parsed.data;
  const wantThumbnail = parsed.data.thumbnail && !!userId && UUID.test(projectId);
  const ownsProject = wantThumbnail
    ? projectRepository
        .findById(projectId)
        .then((p) => p?.userId === userId)
        .catch(() => false)
    : Promise.resolve(false);

  try {
    const result = await compileLatex(parsed.data.content, parsed.data.engine, { thumbnail: wantThumbnail });
    const thumbnail = result.ok ? result.thumbnail : undefined;
    if (thumbnail && (await ownsProject)) {
      // After the response: the user gets the PDF without waiting for the upload.
      after(() => thumbnailService.save(projectId, thumbnail).catch((e) => console.error("Thumbnail not saved:", e)));
    }
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
