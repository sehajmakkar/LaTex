import type { PlanId } from "@/lib/plans";

/**
 * Who gets Pro, decided from what we stored from Dodo. Evaluated on every
 * request (not only when a webhook arrives), so a subscription that lapses
 * without a final webhook still ends on time.
 */

/** A failed renewal keeps Pro this long past the period end while Dodo retries the card. */
export const PAYMENT_GRACE_DAYS = 3;
const DAY = 86_400_000;

export type BillingFields = {
  plan: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd?: boolean | null;
};

export type BillingState =
  | { plan: "free"; reason: "free" | "ended" }
  | { plan: "pro"; reason: "manual" | "active" | "cancelling" | "payment_issue"; until: Date | null };

export function billingState(user: BillingFields | null | undefined, now = new Date()): BillingState {
  if (!user || (user.plan !== "pro" && user.plan !== "pro_plus")) return { plan: "free", reason: "free" };
  const end = user.currentPeriodEnd;
  switch (user.subscriptionStatus) {
    // Granted by hand (no subscription): Pro until someone changes it.
    case null:
    case undefined:
      return { plan: "pro", reason: "manual", until: null };
    case "active":
      if (user.cancelAtPeriodEnd) {
        return end && end > now ? { plan: "pro", reason: "cancelling", until: end } : { plan: "free", reason: "ended" };
      }
      // Renewals move the period end forward; if the renewal webhook is late, the grace period covers it.
      if (end && end.getTime() + PAYMENT_GRACE_DAYS * DAY < now.getTime()) return { plan: "free", reason: "ended" };
      return { plan: "pro", reason: "active", until: end };
    case "on_hold": {
      // Renewal failed; keep Pro for a short grace period while the customer fixes the card.
      const graceEnd = end ? new Date(end.getTime() + PAYMENT_GRACE_DAYS * DAY) : null;
      return graceEnd && graceEnd > now ? { plan: "pro", reason: "payment_issue", until: graceEnd } : { plan: "free", reason: "ended" };
    }
    case "cancelled":
      // Paid until the end of the period.
      return end && end > now ? { plan: "pro", reason: "cancelling", until: end } : { plan: "free", reason: "ended" };
    default:
      // pending, failed, expired, or anything unknown: no Pro.
      return { plan: "free", reason: "ended" };
  }
}

export function effectivePlan(user: BillingFields | null | undefined, now = new Date()): PlanId {
  return billingState(user, now).plan;
}

// ── Webhooks ───────────────────────────────────────────────────────────────

export type SubscriptionEvent = {
  type: string;
  /** The event's time (envelope `timestamp`). */
  timestamp: Date;
  subscriptionId: string;
  status: string;
  productId: string | null;
  customerId: string | null;
  nextBillingDate: Date | null;
  cancelAtNextBillingDate: boolean;
};

export type StoredSubscription = BillingFields & {
  dodoSubscriptionId: string | null;
  subscriptionEventAt: Date | null;
};

export type SubscriptionUpdate = {
  plan: "pro" | "free";
  subscriptionStatus: string;
  dodoSubscriptionId: string;
  dodoCustomerId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  subscriptionEventAt: Date;
};

export type Decision = { apply: true; update: SubscriptionUpdate } | { apply: false; reason: string };

const LIVE_STATUSES = new Set(["active", "on_hold", "cancelled"]);

/**
 * What a subscription webhook should change. Safe against:
 *  - products that aren't ours (never grants Pro);
 *  - events arriving out of order (an older event never overrides a newer one);
 *  - an old subscription's end (cancel/expire) downgrading a newer, active one.
 */
export function decideSubscriptionUpdate(
  current: StoredSubscription | null,
  event: SubscriptionEvent,
  isOurProduct: (productId: string | null) => boolean,
  now = new Date()
): Decision {
  if (!isOurProduct(event.productId)) return { apply: false, reason: "unknown_product" };

  const sameSubscription = current?.dodoSubscriptionId === event.subscriptionId;
  if (sameSubscription && current?.subscriptionEventAt && event.timestamp < current.subscriptionEventAt) {
    return { apply: false, reason: "stale_event" };
  }
  if (!sameSubscription && current?.dodoSubscriptionId && effectivePlan(current, now) === "pro" && current.subscriptionStatus !== null) {
    // The user already has a different live subscription. Only a newer active one may replace it.
    const eventIsNewer = !current.subscriptionEventAt || event.timestamp >= current.subscriptionEventAt;
    if (!(event.status === "active" && eventIsNewer)) return { apply: false, reason: "other_subscription_active" };
  }

  const update: SubscriptionUpdate = {
    plan: "free",
    subscriptionStatus: event.status,
    dodoSubscriptionId: event.subscriptionId,
    dodoCustomerId: event.customerId,
    currentPeriodEnd: event.nextBillingDate,
    cancelAtPeriodEnd: event.cancelAtNextBillingDate,
    subscriptionEventAt: event.timestamp,
  };
  // Store "pro" for statuses that can carry access; billingState() decides the rest by date.
  update.plan = LIVE_STATUSES.has(event.status) ? "pro" : "free";
  if (update.plan === "pro" && effectivePlan(update, now) === "free") update.plan = "free";
  return { apply: true, update };
}
