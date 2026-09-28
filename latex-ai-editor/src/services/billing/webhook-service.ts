import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { processedWebhooks, users } from "@/lib/db/schema";
import { planFromProductId } from "@/lib/billing-config";
import { decideSubscriptionUpdate, type SubscriptionEvent } from "@/lib/billing/entitlements";

/** Dodo's webhook envelope (Standard Webhooks). */
export type DodoEnvelope = {
  business_id?: string;
  type?: string;
  timestamp?: string;
  data?: {
    payload_type?: string;
    subscription_id?: string;
    status?: string;
    product_id?: string;
    customer?: { customer_id?: string; email?: string; name?: string };
    metadata?: Record<string, string>;
    next_billing_date?: string;
    cancel_at_next_billing_date?: boolean;
  };
};

export type WebhookOutcome = { outcome: string; userId?: string };

const date = (value: string | undefined | null) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Applies one Dodo webhook delivery, exactly once. Everything happens in one
 * transaction: the webhook id is recorded (a retry of the same delivery is a
 * no-op), the user's row is locked (events for one user can't interleave),
 * and the subscription rules in entitlements.ts decide what changes. If
 * anything throws, nothing is recorded, so Dodo's retry processes it again.
 */
export async function handleDodoWebhook(webhookId: string, envelope: DodoEnvelope): Promise<WebhookOutcome> {
  const type = envelope.type ?? "unknown";
  const data = envelope.data;

  return db.transaction(async (tx) => {
    const record = async (outcome: string, userId?: string) => {
      await tx
        .insert(processedWebhooks)
        .values({ webhookId, eventType: type, outcome, userId: userId ?? null, subscriptionId: data?.subscription_id ?? null })
        .onConflictDoNothing();
      return outcome;
    };

    const [seen] = await tx.select({ id: processedWebhooks.webhookId }).from(processedWebhooks).where(eq(processedWebhooks.webhookId, webhookId));
    if (seen) return { outcome: "duplicate" };

    if (!type.startsWith("subscription.") || data?.payload_type !== "Subscription" || !data.subscription_id || !data.status) {
      return { outcome: await record("ignored:not_a_subscription_event") };
    }

    // Find the account: the id we put in the checkout metadata, else the Dodo customer/subscription, else a unique email.
    const customerId = data.customer?.customer_id ?? null;
    const byId = async (id: string | undefined) => (id ? (await tx.select().from(users).where(eq(users.id, id)).for("update"))[0] : undefined);
    let user = await byId(data.metadata?.clerk_user_id);
    if (!user && customerId) user = (await tx.select().from(users).where(eq(users.dodoCustomerId, customerId)).for("update"))[0];
    if (!user) user = (await tx.select().from(users).where(eq(users.dodoSubscriptionId, data.subscription_id)).for("update"))[0];
    if (!user && data.customer?.email) {
      const matches = await tx.select().from(users).where(sql`lower(${users.email}) = lower(${data.customer.email})`).for("update");
      if (matches.length === 1) user = matches[0];
    }
    if (!user) {
      // Needs a human: a payment we can't attach to an account.
      console.error(
        JSON.stringify({ event: "billing_webhook_unmatched", webhookId, type, subscriptionId: data.subscription_id, customerId, email: data.customer?.email })
      );
      return { outcome: await record("ignored:no_matching_user") };
    }

    const event: SubscriptionEvent = {
      type,
      timestamp: date(envelope.timestamp) ?? new Date(),
      subscriptionId: data.subscription_id,
      status: data.status,
      productId: data.product_id ?? null,
      customerId,
      nextBillingDate: date(data.next_billing_date),
      cancelAtNextBillingDate: data.cancel_at_next_billing_date === true,
    };
    const decision = decideSubscriptionUpdate(user, event, (productId) => !!productId && planFromProductId(productId) !== null);
    if (!decision.apply) {
      console.warn(JSON.stringify({ event: "billing_webhook_ignored", webhookId, type, userId: user.id, reason: decision.reason }));
      return { outcome: await record(`ignored:${decision.reason}`, user.id), userId: user.id };
    }

    const u = decision.update;
    await tx
      .update(users)
      .set({
        plan: u.plan,
        subscriptionStatus: u.subscriptionStatus,
        dodoSubscriptionId: u.dodoSubscriptionId,
        // Keep a known customer id if an event doesn't carry one.
        ...(u.dodoCustomerId ? { dodoCustomerId: u.dodoCustomerId } : {}),
        currentPeriodEnd: u.currentPeriodEnd,
        cancelAtPeriodEnd: u.cancelAtPeriodEnd,
        subscriptionEventAt: u.subscriptionEventAt,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, user.id)));
    console.log(
      JSON.stringify({ event: "billing_webhook_applied", webhookId, type, userId: user.id, status: u.subscriptionStatus, plan: u.plan, periodEnd: u.currentPeriodEnd })
    );
    return { outcome: await record("applied", user.id), userId: user.id };
  });
}
