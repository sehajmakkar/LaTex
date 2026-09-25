import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPlanLimits, usagePeriod } from "@/lib/plans";
import { userRepository } from "@/repositories/user-repository";
import { userUsageRepository } from "@/repositories/user-usage-repository";

/** Plan + this month's usage, for the sidebar plan card and dashboard. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in to view usage" } },
      { status: 401 }
    );
  }
  try {
    const user = await userRepository.findByClerkId(userId);
    const limits = getPlanLimits(user?.plan);
    const [projects, aiEdits] = await Promise.all([
      userRepository.countProjectsByUserId(userId),
      userUsageRepository.sumAiEditsSince(userId, usagePeriod().monthStart),
    ]);
    return NextResponse.json({
      data: {
        plan: limits.id,
        subscriptionStatus: user?.subscriptionStatus ?? null,
        limits: { projects: limits.projects, aiEditsPerMonth: limits.aiEditsPerMonth },
        usage: { projects, aiEdits },
      },
    });
  } catch (error) {
    console.error("Usage error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load usage" } },
      { status: 500 }
    );
  }
}
