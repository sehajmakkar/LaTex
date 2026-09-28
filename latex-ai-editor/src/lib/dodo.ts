import DodoPayments from "dodopayments";
import { env } from "@/lib/env";
import { planFromProductId } from "@/lib/billing-config";

function getDodoClient(): DodoPayments | null {
  if (!env.DODO_PAYMENTS_API_KEY) return null;
  return new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    environment: env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode",
  });
}

export const dodoClient = getDodoClient();

type AccountRef = { clerkUserId: string; dodoCustomerId: string | null; email: string };

/**
 * Every live (active or on-hold) subscription this account has in Dodo, found
 * by asking Dodo rather than trusting our own copy (a delayed or missed webhook
 * would otherwise hide one). Matches the stored Dodo customer, or customers
 * with the account's email whose subscription carries our Clerk user id.
 * Any of our products counts (including the archived Pro Plus).
 */
export async function listLiveDodoSubscriptions(ref: AccountRef): Promise<{ subscriptionId: string; status: string; productId: string }[]> {
  if (!dodoClient) return [];
  const customerIds = new Set<string>();
  if (ref.dodoCustomerId) customerIds.add(ref.dodoCustomerId);
  if (ref.email) {
    const customers = await dodoClient.customers.list({ email: ref.email });
    for (const c of customers.items ?? []) customerIds.add(c.customer_id);
  }
  const found = new Map<string, { subscriptionId: string; status: string; productId: string }>();
  for (const customerId of customerIds) {
    for (const status of ["active", "on_hold"] as const) {
      const subs = await dodoClient.subscriptions.list({ customer_id: customerId, status });
      for (const s of subs.items ?? []) {
        const ours = planFromProductId(s.product_id) !== null;
        const theirs = s.metadata?.clerk_user_id === ref.clerkUserId || customerId === ref.dodoCustomerId;
        if (ours && theirs) found.set(s.subscription_id, { subscriptionId: s.subscription_id, status: s.status, productId: s.product_id });
      }
    }
  }
  return [...found.values()];
}

/** The first live subscription (see listLiveDodoSubscriptions), or null. */
export async function findLiveDodoSubscription(ref: AccountRef): Promise<{ subscriptionId: string; status: string } | null> {
  return (await listLiveDodoSubscriptions(ref))[0] ?? null;
}

/**
 * Cancels every live subscription on the account right away (used when the
 * account is deleted, so a deleted account is never charged again).
 * Throws if any cancellation fails, so the caller can stop and retry.
 */
export async function cancelAllLiveDodoSubscriptions(ref: AccountRef): Promise<string[]> {
  if (!dodoClient) return [];
  const live = await listLiveDodoSubscriptions(ref);
  for (const s of live) await dodoClient.subscriptions.update(s.subscriptionId, { status: "cancelled" });
  return live.map((s) => s.subscriptionId);
}

/** The product new subscriptions are created for (Pro, $5.99/month). */
export function proProductId(): string | null {
  return env.DODO_PRODUCT_ID_PRO ?? null;
}
