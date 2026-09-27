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

/** The product new subscriptions are created for (Pro, $5.99/month). */
export function proProductId(): string | null {
  return env.DODO_PRODUCT_ID_PRO ?? null;
}
