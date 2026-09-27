import { describe, expect, it } from "vitest";
import { billingState, decideSubscriptionUpdate, effectivePlan, PAYMENT_GRACE_DAYS, type StoredSubscription, type SubscriptionEvent } from "./entitlements";

const NOW = new Date("2026-10-15T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const user = (o: Partial<StoredSubscription>): StoredSubscription => ({
  plan: "pro",
  subscriptionStatus: "active",
  currentPeriodEnd: days(10),
  cancelAtPeriodEnd: false,
  dodoSubscriptionId: "sub_1",
  subscriptionEventAt: days(-20),
  ...o,
});

describe("billingState / effectivePlan", () => {
  it("free users are free", () => {
    expect(effectivePlan({ plan: "free", subscriptionStatus: null, currentPeriodEnd: null }, NOW)).toBe("free");
    expect(effectivePlan(null, NOW)).toBe("free");
  });
  it("Pro granted by hand (no subscription) stays Pro", () => {
    expect(billingState({ plan: "pro", subscriptionStatus: null, currentPeriodEnd: null }, NOW)).toMatchObject({ plan: "pro", reason: "manual" });
  });
  it("active renews; a late renewal webhook is covered by the grace period, then it ends", () => {
    expect(billingState(user({}), NOW)).toMatchObject({ plan: "pro", reason: "active" });
    expect(effectivePlan(user({ currentPeriodEnd: days(-1) }), NOW)).toBe("pro");
    expect(effectivePlan(user({ currentPeriodEnd: days(-(PAYMENT_GRACE_DAYS + 1)) }), NOW)).toBe("free");
  });
  it("cancelled (at period end or outright): Pro until the paid period ends, then Free", () => {
    expect(billingState(user({ cancelAtPeriodEnd: true }), NOW)).toMatchObject({ plan: "pro", reason: "cancelling" });
    expect(effectivePlan(user({ cancelAtPeriodEnd: true, currentPeriodEnd: days(-1) }), NOW)).toBe("free");
    expect(effectivePlan(user({ subscriptionStatus: "cancelled", currentPeriodEnd: days(3) }), NOW)).toBe("pro");
    expect(effectivePlan(user({ subscriptionStatus: "cancelled", currentPeriodEnd: days(-1) }), NOW)).toBe("free");
  });
  it("on hold (failed renewal): a short grace period, then Free", () => {
    expect(billingState(user({ subscriptionStatus: "on_hold", currentPeriodEnd: days(-1) }), NOW)).toMatchObject({ plan: "pro", reason: "payment_issue" });
    expect(effectivePlan(user({ subscriptionStatus: "on_hold", currentPeriodEnd: days(-(PAYMENT_GRACE_DAYS + 1)) }), NOW)).toBe("free");
  });
  it("expired, failed, pending and unknown statuses are Free", () => {
    for (const s of ["expired", "failed", "pending", "weird"]) expect(effectivePlan(user({ subscriptionStatus: s }), NOW)).toBe("free");
  });
  it("legacy pro_plus rows follow the same rules", () => {
    expect(effectivePlan(user({ plan: "pro_plus" }), NOW)).toBe("pro");
  });
});

const ours = (id: string | null) => id === "pdt_pro";
const event = (o: Partial<SubscriptionEvent>): SubscriptionEvent => ({
  type: "subscription.active",
  timestamp: NOW,
  subscriptionId: "sub_1",
  status: "active",
  productId: "pdt_pro",
  customerId: "cus_1",
  nextBillingDate: days(30),
  cancelAtNextBillingDate: false,
  ...o,
});

describe("decideSubscriptionUpdate", () => {
  const freeUser = user({ plan: "free", subscriptionStatus: null, currentPeriodEnd: null, dodoSubscriptionId: null, subscriptionEventAt: null });

  it("activation grants Pro and stores the customer and period", () => {
    const d = decideSubscriptionUpdate(freeUser, event({}), ours, NOW);
    expect(d).toMatchObject({ apply: true, update: { plan: "pro", subscriptionStatus: "active", dodoCustomerId: "cus_1", currentPeriodEnd: days(30) } });
  });
  it("never grants Pro for a product that isn't ours", () => {
    expect(decideSubscriptionUpdate(freeUser, event({ productId: "pdt_someone_else" }), ours, NOW)).toEqual({ apply: false, reason: "unknown_product" });
    expect(decideSubscriptionUpdate(freeUser, event({ productId: null }), ours, NOW)).toEqual({ apply: false, reason: "unknown_product" });
  });
  it("ignores an older event for the same subscription (out of order)", () => {
    const current = user({ subscriptionEventAt: NOW });
    expect(decideSubscriptionUpdate(current, event({ status: "expired", timestamp: days(-1) }), ours, NOW)).toEqual({ apply: false, reason: "stale_event" });
  });
  it("an old subscription ending doesn't downgrade a newer active one", () => {
    const current = user({ dodoSubscriptionId: "sub_new", subscriptionEventAt: days(-1) });
    expect(decideSubscriptionUpdate(current, event({ subscriptionId: "sub_old", status: "expired" }), ours, NOW)).toEqual({ apply: false, reason: "other_subscription_active" });
    // …but a newer active subscription may replace it.
    expect(decideSubscriptionUpdate(current, event({ subscriptionId: "sub_newer", status: "active" }), ours, NOW)).toMatchObject({ apply: true });
  });
  it("cancellation at period end keeps Pro until then", () => {
    const d = decideSubscriptionUpdate(user({}), event({ type: "subscription.updated", cancelAtNextBillingDate: true, nextBillingDate: days(10) }), ours, NOW);
    expect(d.apply && d.update.plan).toBe("pro");
    expect(d.apply && billingState({ ...d.update }, NOW)).toMatchObject({ plan: "pro", reason: "cancelling" });
  });
  it("expired/failed → Free; on hold past the grace period → Free", () => {
    expect(decideSubscriptionUpdate(user({}), event({ status: "expired" }), ours, NOW)).toMatchObject({ apply: true, update: { plan: "free" } });
    expect(decideSubscriptionUpdate(user({}), event({ status: "failed" }), ours, NOW)).toMatchObject({ apply: true, update: { plan: "free" } });
    expect(
      decideSubscriptionUpdate(user({}), event({ status: "on_hold", nextBillingDate: days(-(PAYMENT_GRACE_DAYS + 2)) }), ours, NOW)
    ).toMatchObject({ apply: true, update: { plan: "free", subscriptionStatus: "on_hold" } });
  });
});
