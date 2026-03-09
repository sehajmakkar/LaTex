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

    const contentType =
      row.resumeFileMimeType || (object.ContentType as string | undefined) || "application/octet-stream";
    const fileName = row.resumeFileName || "resume";

    return new NextResponse(body as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
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

