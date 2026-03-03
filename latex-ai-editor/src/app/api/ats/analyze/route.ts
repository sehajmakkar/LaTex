import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { projectService } from "@/services/project-service";
import { extractPlainTextFromLatex } from "@/services/ats/text-extractor";
import { analyzeAtsFromText } from "@/services/ats/ats-service";
import { atsRepository } from "@/repositories/ats-repository";
import { userService } from "@/services/user-service";
import { userUsageRepository } from "@/repositories/user-usage-repository";

const AnalyzeSchema = z.object({
  source: z.enum(["editor", "upload"]),
  projectId: z.string().uuid().optional(),
  text: z.string().min(10).optional(),
  jobDescription: z.string().min(0).max(10_000).optional(),
});

const FREE_ATS_SCANS_PER_DAY = 3;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to run ATS analysis" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = AnalyzeSchema.safeParse(body);
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

    const { source, projectId, text, jobDescription } = parsed.data;

    const user = await userService.getByClerkId(userId);
    const plan = user.plan ?? "free";

    // Rate limiting for free plan
    if (plan === "free") {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const usage = await userUsageRepository.getOrCreateToday(userId, today);
      if (usage.atsScans >= FREE_ATS_SCANS_PER_DAY) {
        return NextResponse.json(
          {
            error: {
              code: "ATS_LIMIT_REACHED",
              message:
                "Free accounts can run up to 3 ATS scans per day. Upgrade to Pro for unlimited scans.",
            },
          },
          { status: 429 }
        );
      }
    }

    let resumeText: string;
    let resolvedProjectId: string | null = null;
    let sourceLabel: "editor" | "upload_pdf" | "upload_docx" | "upload_txt";

    if (source === "editor") {
      if (!projectId) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "projectId is required when source is editor",
            },
          },
          { status: 400 }
        );
      }
      const project = await projectService.getById(projectId);
      if (project.userId !== userId) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Project not found" } },
          { status: 404 }
        );
      }
      const extracted = extractPlainTextFromLatex(project.content);
      resumeText = extracted.text;
      resolvedProjectId = project.id;
      sourceLabel = "editor";
    } else {
      if (!text) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "text is required when source is upload",
            },
          },
          { status: 400 }
        );
      }
      resumeText = text;
      // For now we don't track exact upload type here; default to upload_txt-like
      sourceLabel = "upload_txt";
    }

    const report = await analyzeAtsFromText(resumeText, jobDescription);

    if (plan === "free") {
      const today = new Date().toISOString().slice(0, 10);
      await userUsageRepository.incrementAtsScans(userId, today);
    }

    const stored = await atsRepository.create({
      userId,
      projectId: resolvedProjectId,
      source: sourceLabel,
      resumeText,
      score: report.combinedScore,
      parseScore: report.parseScore,
      qualityScore: report.qualityScore,
      report: JSON.stringify(report),
      jobDescription: jobDescription ?? null,
    });

    return NextResponse.json({
      data: {
        id: stored.id,
        report,
      },
    });
  } catch (error) {
    console.error("ATS analyze error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to run ATS analysis",
        },
      },
      { status: 500 }
    );
  }
}

