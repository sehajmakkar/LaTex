import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { atsRepository } from "@/repositories/ats-repository";
import { getResumeObject } from "@/services/storage/r2";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to view ATS reports" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const row = await atsRepository.findById(id, userId);
    if (!row || !row.resumeFileKey) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Original resume file not found" } },
        { status: 404 }
      );
    }

    const object = await getResumeObject({ key: row.resumeFileKey });
    const body = object.Body;

    if (!body) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Original resume file not found" } },
        { status: 404 }
      );
    }

    // The type comes from what we detected at upload (source + magic bytes), never from
    // the browser-supplied type, so an upload can't be served as HTML on our origin.
    const SAFE_TYPES: Record<string, string> = {
      upload_pdf: "application/pdf",
      editor: "application/pdf",
      upload_docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upload_txt: "text/plain; charset=utf-8",
    };
    const contentType = SAFE_TYPES[row.source] ?? "application/octet-stream";
    const fileName = row.resumeFileName || "resume";
    // Only PDFs display inline (the report's preview); everything else downloads.
    const disposition = contentType === "application/pdf" ? "inline" : "attachment";

    return new NextResponse(body.transformToWebStream(), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(fileName)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("ATS resume file stream error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load original resume file",
        },
      },
      { status: 500 }
    );
  }
}
