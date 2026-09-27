import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { userRepository } from "@/repositories/user-repository";
import { billingState } from "@/lib/billing/entitlements";

/** The signed-in user's billing state, for the billing page. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in to view billing" } }, { status: 401 });
  try {
    const user = await userRepository.findByClerkId(userId);
    const state = billingState(user);
    return NextResponse.json({
      data: {
        plan: state.plan,
        // free | ended | manual | active | cancelling | payment_issue
        reason: state.reason,
        until: state.plan === "pro" ? (state.until?.toISOString() ?? null) : null,
        subscriptionStatus: user?.subscriptionStatus ?? null,
        canManage: !!user?.dodoCustomerId,
      },
    });
  } catch (e) {
    console.error("Billing me error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load billing" } }, { status: 500 });
  }
}
