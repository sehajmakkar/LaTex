import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { userService } from "@/services/user-service";
import { dodoClient, getProductIdForPlan } from "@/lib/dodo";
import { env } from "@/lib/env";

const CheckoutSchema = z.object({
  plan: z.enum(["pro", "pro_plus"]),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to upgrade" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid plan" } },
        { status: 400 }
      );
    }

    const productId = getProductIdForPlan(parsed.data.plan);
    if (!productId || !dodoClient) {
      return NextResponse.json(
        {
          error: {
            code: "BILLING_NOT_CONFIGURED",
            message: "Billing is not configured. Set Dodo Payments env vars.",
          },
        },
        { status: 503 }
      );
    }

    const user = await userService.getByClerkId(userId);
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? user?.email ?? "";
    const name = clerkUser?.fullName ?? user?.name ?? "Customer";

    const baseUrl = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    const returnUrl = `${baseUrl}/billing/success`;

    const session = await dodoClient.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email, name },
      return_url: returnUrl,
      metadata: { clerk_user_id: userId },
    });

    const checkoutUrl =
      session && "checkout_url" in session
        ? (session as { checkout_url?: string }).checkout_url
        : null;
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: { code: "CHECKOUT_FAILED", message: "No checkout URL returned" } },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: { checkout_url: checkoutUrl } });
  } catch (error) {
    console.error("Billing checkout error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create checkout" } },
      { status: 500 }
    );
  }
}
