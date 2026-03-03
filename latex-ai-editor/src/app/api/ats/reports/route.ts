import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { atsRepository } from "@/repositories/ats-repository";

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to view ATS reports" } },
        { status: 401 }
      );
    }

    const reports = await atsRepository.listByUser(userId, 50);

    return NextResponse.json({
      data: reports.map((r) => ({
        id: r.id,
        score: r.score,
        parseScore: r.parseScore,
        qualityScore: r.qualityScore,
        createdAt: r.createdAt,
        source: r.source,
        projectId: r.projectId,
      })),
    });
  } catch (error) {
    console.error("ATS reports list error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load ATS reports",
        },
      },
      { status: 500 }
    );
  }
}

