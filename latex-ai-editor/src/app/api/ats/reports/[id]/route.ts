import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { atsRepository } from "@/repositories/ats-repository";
import { userRepository } from "@/repositories/user-repository";
import { getPlanLimits } from "@/lib/plans";
import { redactForPlan } from "@/services/ats/redact";
import type { AtsReportV2 } from "@/services/ats/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in to view ATS reports" } }, { status: 401 });
  }
  try {
    const { id } = await params;
    const row = await atsRepository.findById(id, userId);
    if (!row) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "ATS report not found" } }, { status: 404 });
    }

    const stored = JSON.parse(row.report) as Partial<AtsReportV2>;
    const plan = getPlanLimits((await userRepository.findByClerkId(userId))?.plan).id;
    // Reports from before the v2 engine can't be shown in the new layout.
    const report = stored.version === 2 ? redactForPlan(stored as AtsReportV2, plan) : null;

    return NextResponse.json({
      data: {
        id: row.id,
        createdAt: row.createdAt,
        source: row.source,
        projectId: row.projectId,
        fileName: row.resumeFileName,
        hasFile: !!row.resumeFileKey,
        fileMimeType: row.resumeFileMimeType,
        resumeText: row.resumeText,
        jobDescription: row.jobDescription,
        plan,
        report,
        legacy: report === null,
      },
    });
  } catch (error) {
    console.error("ATS report error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load the report" } }, { status: 500 });
  }
}
