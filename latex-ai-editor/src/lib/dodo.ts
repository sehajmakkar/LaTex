import DodoPayments from "dodopayments";
import { env } from "@/lib/env";

function getDodoClient(): DodoPayments | null {
  if (!env.DODO_PAYMENTS_API_KEY) return null;
  return new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    environment: env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode",
  });
}

export const dodoClient = getDodoClient();

/**
 * A live (active or on-hold) Pro subscription this account already has in Dodo,
 * found by asking Dodo rather than trusting our own copy (a delayed or missed
 * webhook would otherwise allow a second subscription). Matches the stored
 * Dodo customer, or customers with the account's email whose subscription
 * carries our Clerk user id.
 */
export async function findLiveDodoSubscription(params: {
  clerkUserId: string;
  dodoCustomerId: string | null;
  email: string;
}): Promise<{ subscriptionId: string; status: string } | null> {
  if (!dodoClient) return null;
  const productId = env.DODO_PRODUCT_ID_PRO;
  const customerIds = new Set<string>();
  if (params.dodoCustomerId) customerIds.add(params.dodoCustomerId);
  if (params.email) {
    const customers = await dodoClient.customers.list({ email: params.email });
    for (const c of customers.items ?? []) customerIds.add(c.customer_id);
  }
  for (const customerId of customerIds) {
    for (const status of ["active", "on_hold"] as const) {
      const subs = await dodoClient.subscriptions.list({ customer_id: customerId, status, ...(productId ? { product_id: productId } : {}) });
      const match = (subs.items ?? []).find(
        (s) => s.metadata?.clerk_user_id === params.clerkUserId || customerId === params.dodoCustomerId
      );
      if (match) return { subscriptionId: match.subscription_id, status: match.status };
    }
  }
  return null;
}

/** The product new subscriptions are created for (Pro, $5.99/month). */
export function proProductId(): string | null {
  return env.DODO_PRODUCT_ID_PRO ?? null;
}
