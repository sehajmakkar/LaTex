/** What the post-checkout page shows, from Dodo's return URL and later checks. */
export type CheckoutPageState = "activating" | "pro" | "slow" | "processing" | "failed" | "checking" | "not_found";
export type CheckoutOutcome = "succeeded" | "processing" | "failed";

/** How long "activating" may take before we say it's slow (checking continues). */
export const ACTIVATING_MS = 30_000;
/** With no ids in the URL and no Pro after this long, there's probably no payment. */
export const NOT_FOUND_MS = 20_000;

/** Dodo's `status` query parameter → outcome (null if absent). */
export function outcomeFromUrl(status: string | null): CheckoutOutcome | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "succeeded" || s === "active") return "succeeded";
  if (s === "failed" || s === "cancelled" || s === "expired") return "failed";
  return "processing";
}

export function initialCheckoutState(url: CheckoutOutcome | null): CheckoutPageState {
  if (url === "failed") return "failed";
  if (url === "processing") return "processing";
  if (url === "succeeded") return "activating";
  return "checking";
}

/**
 * The next state after a check. `server` is Dodo's answer via our API (null if
 * unavailable). Returns `done` when there's nothing more to wait for.
 */
export function nextCheckoutState(input: {
  current: CheckoutPageState;
  isPro: boolean;
  server: CheckoutOutcome | null;
  url: CheckoutOutcome | null;
  hasIds: boolean;
  elapsedMs: number;
}): { state: CheckoutPageState; done: boolean } {
  const { current, isPro, server, url, hasIds, elapsedMs } = input;
  // The webhook switched the plan: that's the real success.
  if (isPro) return { state: "pro", done: true };
  // Dodo's API only overrides the URL when it confirms success: a declined card can stay
  // "pending/processing" in the API while Dodo's page already reported the failure.
  if (server === "failed" || (url === "failed" && server !== "succeeded")) return { state: "failed", done: true };
  if (server === "processing") return { state: "processing", done: false };
  if (server === "succeeded") return { state: elapsedMs > ACTIVATING_MS ? "slow" : "activating", done: false };
  if (!hasIds && !url && elapsedMs > NOT_FOUND_MS) return { state: "not_found", done: true };
  if (current === "activating" && elapsedMs > ACTIVATING_MS) return { state: "slow", done: false };
  return { state: current, done: false };
}
