import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dodoClient } from "@/lib/dodo";
import { allowRequest } from "@/lib/rate-limit";
import { userRepository } from "@/repositories/user-repository";

export type CheckoutOutcome = "succeeded" | "processing" | "failed";

const error = (code: string, message: string, status: number) => NextResponse.json({ error: { code, message } }, { status });

function fromPaymentStatus(status: string | null | undefined): CheckoutOutcome {
  if (status === "succeeded") return "succeeded";
  if (status === "failed" || status === "cancelled") return "failed";
  return "processing"; // processing, requires_* (e.g. 3-D Secure / mandate), unknown
}

/**
 * The real outcome of a checkout, asked from Dodo (the return URL's `status`
 * can be missing or edited). Only for the signed-in user's own subscription or
 * payment. Webhooks still decide the plan; this only drives the success page.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("UNAUTHORIZED", "Sign in first.", 401);
  if (!dodoClient) return error("BILLING_NOT_CONFIGURED", "Billing isn't available right now.", 503);
  if (!allowRequest(`checkout-status:${userId}`, 40)) return error("RATE_LIMITED", "Too many checks.", 429);

  const subscriptionId = req.nextUrl.searchParams.get("subscription_id");
  const paymentId = req.nextUrl.searchParams.get("payment_id");
  if (!subscriptionId && !paymentId) return error("BAD_REQUEST", "Missing subscription_id or payment_id.", 400);
  const valid = (id: string | null) => !id || /^[A-Za-z0-9_]{4,64}$/.test(id);
  if (!valid(subscriptionId) || !valid(paymentId)) return error("BAD_REQUEST", "Invalid id.", 400);

  const user = await userRepository.findByClerkId(userId);
  const owns = (metadata: Record<string, string> | null | undefined, customerId: string | undefined) =>
    metadata?.clerk_user_id === userId || (!!user?.dodoCustomerId && customerId === user.dodoCustomerId);

  try {
    if (subscriptionId) {
      const sub = await dodoClient.subscriptions.retrieve(subscriptionId);
      if (!owns(sub.metadata, sub.customer?.customer_id)) return error("NOT_FOUND", "Not found.", 404);
      // The latest payment tells failed vs still processing (the subscription stays "pending" for both).
      const page = await dodoClient.payments.list({ subscription_id: subscriptionId });
      const latest = [...(page.items ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      let outcome: CheckoutOutcome;
      if (sub.status === "active") outcome = "succeeded";
      else if (sub.status === "failed" || sub.status === "cancelled" || sub.status === "expired") outcome = "failed";
      else outcome = latest ? fromPaymentStatus(latest.status) : "processing";
      return NextResponse.json({ data: { outcome, subscriptionStatus: sub.status, paymentStatus: latest?.status ?? null } });
    }
    const payment = await dodoClient.payments.retrieve(paymentId!);
    if (!owns(payment.metadata, payment.customer?.customer_id)) return error("NOT_FOUND", "Not found.", 404);
    return NextResponse.json({ data: { outcome: fromPaymentStatus(payment.status), subscriptionStatus: null, paymentStatus: payment.status ?? null } });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 404) return error("NOT_FOUND", "Not found.", 404);
    console.error("Checkout status error:", e);
    return error("DODO_ERROR", "Couldn't check the payment right now.", 502);
  }
}
