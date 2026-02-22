import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { projectService } from "@/services/project-service";
import { AppError } from "@/lib/errors";

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  content: z.string().optional(),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to view this project" } },
        { status: 401 }
      );
    }
    const { id } = await params;
    const project = await projectService.getById(id);
    if (project.userId !== userId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: project });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch project" } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to update this project" } },
        { status: 401 }
      );
    }
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const project = await projectService.update(id, userId, parsed.data);
    return NextResponse.json({ data: project });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update project" } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to delete this project" } },
        { status: 401 }
      );
    }
    const { id } = await params;
    await projectService.delete(id, userId);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete project" } },
      { status: 500 }
    );
  }
}
