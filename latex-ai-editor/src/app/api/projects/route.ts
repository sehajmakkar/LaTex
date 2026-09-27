import { NextRequest, NextResponse } from "next/server";
import { effectivePlan } from "@/lib/billing/entitlements";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { projectService } from "@/services/project-service";
import { userService } from "@/services/user-service";
import { AppError, ProjectLimitError } from "@/lib/errors";
import { getTemplateById, getTemplatePreview } from "@/templates";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  content: z.string().optional(),
  templateId: z.string().optional(),
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to view projects" } },
        { status: 401 }
      );
    }
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
    const name = clerkUser?.fullName ?? null;
    const user = await userService.ensureUser(userId, email, name);
    const projects = await projectService.getByUserId(userId);
    return NextResponse.json({
      // The dashboard shows the resume's own thumbnail, or its template's preview until the first compile.
      data: projects.map((p) => ({ ...p, templatePreview: getTemplatePreview(p.templateId) })),
      plan: effectivePlan(user),
    });
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to create a project" } },
        { status: 401 }
      );
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
    const name = clerkUser?.fullName ?? null;
    await userService.ensureUser(userId, email, name);

    const body = await req.json();
    const parsed = CreateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const project = await projectService.createForUser(userId, {
      name: parsed.data.name ?? "Untitled Project",
      content: parsed.data.content ?? "",
      templateId: parsed.data.templateId ?? null,
      // Start with the engine the template is known to compile with.
      lastEngine: parsed.data.templateId ? (getTemplateById(parsed.data.templateId)?.engine ?? null) : null,
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    if (error instanceof ProjectLimitError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
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
