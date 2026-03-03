import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { atsRepository } from "@/repositories/ats-repository";
import type { ATSReport as CombinedReport } from "@/services/ats/ats-service";

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
    if (!row) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "ATS report not found" } },
        { status: 404 }
      );
    }

    let report: CombinedReport;
    try {
      report = JSON.parse(row.report) as CombinedReport;
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "PARSE_ERROR",
            message: "Stored ATS report is invalid",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        id: row.id,
        createdAt: row.createdAt,
        source: row.source,
        projectId: row.projectId,
        score: row.score,
        parseScore: row.parseScore,
        qualityScore: row.qualityScore,
        resumeText: row.resumeText,
        jobDescription: row.jobDescription,
        report,
      },
    });
  } catch (error) {
    console.error("ATS report detail error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load ATS report",
        },
      },
      { status: 500 }
    );
  }
}

