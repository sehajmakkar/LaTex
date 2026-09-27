import { env } from "@/lib/env";

/**
 * Maps a Dodo product id to our plan. Only configured products count; anything
 * else is ignored by the webhook (it must never grant Pro).
 * DODO_PRODUCT_ID_PRO_PLUS is the archived Pro Plus product: old subscriptions
 * to it are treated as Pro.
 */
export function planFromProductId(productId: string): "pro" | null {
  if (env.DODO_PRODUCT_ID_PRO && productId === env.DODO_PRODUCT_ID_PRO) return "pro";
  if (env.DODO_PRODUCT_ID_PRO_PLUS && productId === env.DODO_PRODUCT_ID_PRO_PLUS) return "pro";
  return null;
}
