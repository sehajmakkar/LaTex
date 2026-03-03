import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { userService } from "@/services/user-service";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to view billing" } },
        { status: 401 }
      );
    }
    const user = await userService.getByClerkId(userId);
    return NextResponse.json({
      data: {
        plan: user?.plan ?? "free",
        subscriptionStatus: user?.subscriptionStatus ?? null,
      },
    });
  } catch (error) {
    console.error("Billing me error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load billing" } },
      { status: 500 }
    );
  }
}
