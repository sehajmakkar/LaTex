import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { userService } from "@/services/user-service";
import { userRepository } from "@/repositories/user-repository";
import { dodoClient, proProductId } from "@/lib/dodo";
import { billingState } from "@/lib/billing/entitlements";
import { allowRequest } from "@/lib/rate-limit";
import { env } from "@/lib/env";

const CheckoutSchema = z.object({ plan: z.literal("pro") });

const error = (code: string, message: string, status: number) => NextResponse.json({ error: { code, message } }, { status });

/**
 * Starts a Dodo checkout for Pro. Guards: signed in, not already Pro (no second
 * subscription), a few attempts a minute at most. The Clerk user id goes into
 * the checkout metadata, which is how the webhook finds the account.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("UNAUTHORIZED", "Sign in to upgrade.", 401);
  if (!CheckoutSchema.safeParse(await req.json().catch(() => null)).success) return error("BAD_REQUEST", "Invalid plan.", 400);

  const productId = proProductId();
  if (!productId || !dodoClient) return error("BILLING_NOT_CONFIGURED", "Billing isn't available right now.", 503);
  if (!allowRequest(`checkout:${userId}`, 5)) return error("RATE_LIMITED", "Too many attempts. Wait a minute and try again.", 429);

  try {
    let user = await userRepository.findByClerkId(userId);
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? user?.email ?? "";
    if (!user) user = await userService.ensureUser(userId, email, clerkUser?.fullName ?? null);

    // Already paying (or Pro by hand): don't open a second subscription.
    const state = billingState(user);
    if (state.plan === "pro") {
      return error(
        "ALREADY_PRO",
        state.reason === "cancelling"
          ? "Your Pro plan is still active until the end of the period. Use Manage subscription to resume it."
          : "You're already on Pro.",
        409
      );
    }
    if (!email && !user?.dodoCustomerId) return error("NO_EMAIL", "Your account has no email address for the receipt.", 400);

    const baseUrl = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    const session = await dodoClient.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      // Reuse the Dodo customer if we have one, so a returning subscriber isn't duplicated.
      customer: user?.dodoCustomerId ? { customer_id: user.dodoCustomerId } : { email, name: clerkUser?.fullName ?? user?.name ?? undefined },
      return_url: `${baseUrl}/billing/success`,
      metadata: { clerk_user_id: userId },
    });
    const checkoutUrl = (session as { checkout_url?: string } | null)?.checkout_url;
    if (!checkoutUrl) return error("CHECKOUT_FAILED", "Couldn't start checkout. Please try again.", 502);

    console.log(JSON.stringify({ event: "billing_checkout_created", userId, sessionId: (session as { session_id?: string }).session_id }));
    return NextResponse.json({ data: { checkout_url: checkoutUrl } });
  } catch (e) {
    console.error("Billing checkout error:", e);
    return error("INTERNAL_ERROR", "Couldn't start checkout. Please try again.", 500);
  }
}
