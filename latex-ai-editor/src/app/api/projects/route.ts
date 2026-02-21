import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { projectService } from "@/services/project-service";
import { AppError } from "@/lib/errors";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  content: z.string().optional(),
  templateId: z.string().optional(),
});

export async function GET() {
  try {
    const projects = await projectService.getAll();
    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch projects" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const project = await projectService.create({
      name: parsed.data.name || "Untitled Project",
      content: parsed.data.content || "",
      templateId: parsed.data.templateId || null,
      userId: null,
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.statusCode }
      );
    }
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create project" } },
      { status: 500 }
    );
  }
}
