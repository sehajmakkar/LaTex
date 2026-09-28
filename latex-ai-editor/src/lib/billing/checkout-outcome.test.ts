import { describe, expect, it } from "vitest";
import { initialCheckoutState, nextCheckoutState, outcomeFromUrl, ACTIVATING_MS, NOT_FOUND_MS } from "./checkout-outcome";

const base = { current: "checking" as const, isPro: false, server: null, url: null, hasIds: true, elapsedMs: 1_000 };

describe("post-checkout page", () => {
  it("reads Dodo's status parameter", () => {
    expect(outcomeFromUrl("succeeded")).toBe("succeeded");
    expect(outcomeFromUrl("failed")).toBe("failed");
    expect(outcomeFromUrl("processing")).toBe("processing");
    expect(outcomeFromUrl(null)).toBeNull();
    expect(initialCheckoutState("failed")).toBe("failed");
    expect(initialCheckoutState("succeeded")).toBe("activating");
    expect(initialCheckoutState(null)).toBe("checking");
  });

  it("failed card: shows failure and stops, even while Dodo's API still says processing (the case you hit)", () => {
    expect(nextCheckoutState({ ...base, current: "failed", url: "failed", server: "processing" })).toEqual({ state: "failed", done: true });
    expect(nextCheckoutState({ ...base, current: "failed", url: "failed", server: null })).toEqual({ state: "failed", done: true });
  });

  it("…but a confirmed success from Dodo wins over a failed URL", () => {
    expect(nextCheckoutState({ ...base, url: "failed", server: "succeeded" }).state).toBe("activating");
  });

  it("success: activating → Pro once the webhook lands; slow after 30 s", () => {
    expect(nextCheckoutState({ ...base, current: "activating", url: "succeeded", server: "succeeded" })).toEqual({ state: "activating", done: false });
    expect(nextCheckoutState({ ...base, current: "activating", url: "succeeded", server: "succeeded", elapsedMs: ACTIVATING_MS + 1 }).state).toBe("slow");
    expect(nextCheckoutState({ ...base, current: "slow", isPro: true })).toEqual({ state: "pro", done: true });
  });

  it("processing (bank confirming): says so and keeps waiting", () => {
    expect(nextCheckoutState({ ...base, current: "processing", url: "processing", server: "processing" })).toEqual({ state: "processing", done: false });
  });

  it("a failure found later by the API stops the wait", () => {
    expect(nextCheckoutState({ ...base, current: "processing", url: "processing", server: "failed" })).toEqual({ state: "failed", done: true });
  });

  it("no ids and no status (opened by hand): 'no payment found' after a short check", () => {
    const noInfo = { ...base, hasIds: false };
    expect(nextCheckoutState(noInfo)).toEqual({ state: "checking", done: false });
    expect(nextCheckoutState({ ...noInfo, elapsedMs: NOT_FOUND_MS + 1 })).toEqual({ state: "not_found", done: true });
  });
});
