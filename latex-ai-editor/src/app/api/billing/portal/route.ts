import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { userRepository } from "@/repositories/user-repository";
import { dodoClient } from "@/lib/dodo";
import { allowRequest } from "@/lib/rate-limit";

const error = (code: string, message: string, status: number) => NextResponse.json({ error: { code, message } }, { status });

/**
 * Opens Dodo's customer portal (cancel or resume, update the card, invoices)
 * for the signed-in user's own Dodo customer.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) return error("UNAUTHORIZED", "Sign in to manage your subscription.", 401);
  if (!dodoClient) return error("BILLING_NOT_CONFIGURED", "Billing isn't available right now.", 503);
  if (!allowRequest(`portal:${userId}`, 5)) return error("RATE_LIMITED", "Too many attempts. Wait a minute and try again.", 429);

  const user = await userRepository.findByClerkId(userId);
  if (!user?.dodoCustomerId) return error("NO_SUBSCRIPTION", "There's no subscription on this account yet.", 404);
  try {
    const session = await dodoClient.customers.customerPortal.create(user.dodoCustomerId);
    if (!session?.link) return error("PORTAL_FAILED", "Couldn't open the billing portal. Please try again.", 502);
    return NextResponse.json({ data: { url: session.link } });
  } catch (e) {
    console.error("Billing portal error:", e);
    return error("PORTAL_FAILED", "Couldn't open the billing portal. Please try again.", 502);
  }
}
