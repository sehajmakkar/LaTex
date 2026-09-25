/**
 * Single source of truth for plan limits (VERO_REVIVAL_PLAN.md §7). Server
 * routes enforce these; the pricing page should read them too (Phase 2).
 * Monthly limits reset on the 1st (UTC). Resume work is bursty, so monthly
 * caps are kinder than daily ones; per-minute burst limits stop scripts.
 */

export type PlanId = "free" | "pro";

export type PlanLimits = {
  projects: number;
  aiEditsPerMonth: number;
  aiEditsPerMinute: number;
};

export const PLANS: Record<PlanId, PlanLimits> = {
  free: { projects: 3, aiEditsPerMonth: 40, aiEditsPerMinute: 10 },
  pro: { projects: 100, aiEditsPerMonth: 1000, aiEditsPerMinute: 20 },
};

/** Maps the stored plan string (including legacy "pro_plus") to limits. */
export function getPlanLimits(plan: string | null | undefined): PlanLimits & { id: PlanId } {
  const id: PlanId = plan === "pro" || plan === "pro_plus" ? "pro" : "free";
  return { id, ...PLANS[id] };
}

/** YYYY-MM-DD for today and the 1st of this month (UTC), as stored in user_usage.date. */
export function usagePeriod(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return { today, monthStart: `${today.slice(0, 7)}-01` };
}
