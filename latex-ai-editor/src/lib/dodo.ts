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

export type PlanSlug = "free" | "pro" | "pro_plus";

export function getProductIdForPlan(plan: "pro" | "pro_plus"): string | null {
  if (plan === "pro") return env.DODO_PRODUCT_ID_PRO ?? null;
  if (plan === "pro_plus") return env.DODO_PRODUCT_ID_PRO_PLUS ?? null;
  return null;
}
