import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { projectService } from "@/services/project-service";
import { AppError } from "@/lib/errors";
import { MAX_PROJECT_NAME } from "@/lib/project-names";

const Body = z.object({ name: z.string().trim().max(MAX_PROJECT_NAME).optional() });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Makes a copy of a resume. Body: `{ name? }` (default "Name (copy)"). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in to copy a resume" } }, { status: 401 });
  }
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Resume not found" } }, { status: 404 });
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: `Keep the name under ${MAX_PROJECT_NAME} characters.` } }, { status: 400 });
  }
  try {
    const project = await projectService.duplicate(id, userId, body.data.name);
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode });
    }
    console.error("Error duplicating project:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Couldn't copy the resume" } }, { status: 500 });
  }
}
