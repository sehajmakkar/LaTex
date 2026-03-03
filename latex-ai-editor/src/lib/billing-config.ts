import { env } from "@/lib/env";

/**
 * Maps Dodo product IDs to our internal plan names.
 * Set DODO_PRODUCT_ID_PRO and DODO_PRODUCT_ID_PRO_PLUS in env.
 */
export function planFromProductId(productId: string): string | null {
  if (env.DODO_PRODUCT_ID_PRO && productId === env.DODO_PRODUCT_ID_PRO)
    return "pro";
  if (
    env.DODO_PRODUCT_ID_PRO_PLUS &&
    productId === env.DODO_PRODUCT_ID_PRO_PLUS
  )
    return "pro_plus";
  return null;
}
