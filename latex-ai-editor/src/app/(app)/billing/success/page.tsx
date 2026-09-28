"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, SearchX, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/shell/Page";
import { startProCheckout } from "@/lib/client/actions";
import {
  initialCheckoutState,
  nextCheckoutState,
  outcomeFromUrl,
  type CheckoutOutcome,
  type CheckoutPageState,
} from "@/lib/billing/checkout-outcome";

/**
 * Where Dodo sends the customer after checkout, with ?status=succeeded|failed|processing
 * and ?subscription_id (or payment_id). The page starts from that status, then
 * confirms it with Dodo through our server (the URL alone isn't trusted), and
 * watches for the webhook to switch the plan to Pro.
 *
 *   succeeded  → "Payment received, activating Pro…" → "You're on Pro"
 *   processing → "Payment processing" (bank still confirming); Pro turns on by itself
 *   failed     → "Payment didn't go through", try again
 *   (no info)  → checking… → "We couldn't find a payment"
 */

type State = CheckoutPageState;
type Outcome = CheckoutOutcome;

const POLL_MS = 3_000;
/** Stop checking after this long; the webhook still activates Pro whenever it arrives. */
const GIVE_UP_MS = 5 * 60_000;

function SuccessInner() {
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const subscriptionId = params.get("subscription_id");
  const paymentId = params.get("payment_id");
  const urlOutcome = outcomeFromUrl(params.get("status"));
  const [state, setState] = useState<State>(() => initialCheckoutState(urlOutcome));
  const [retrying, setRetrying] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const serverOutcome = async (): Promise<Outcome | null> => {
      if (!subscriptionId && !paymentId) return null;
      const q = subscriptionId ? `subscription_id=${encodeURIComponent(subscriptionId)}` : `payment_id=${encodeURIComponent(paymentId!)}`;
      const res = await fetch(`/api/billing/checkout-status?${q}`).catch(() => null);
      if (!res?.ok) return null;
      return ((await res.json()).data?.outcome as Outcome) ?? null;
    };
    const isPro = async () => {
      const res = await fetch("/api/usage").catch(() => null);
      return res?.ok ? (await res.json()).data?.plan === "pro" : false;
    };

    const tick = async () => {
      if (stopped) return;
      const [pro, outcome] = await Promise.all([isPro(), serverOutcome()]);
      if (stopped) return;
      const elapsed = Date.now() - started;
      const next = nextCheckoutState({
        current: stateRef.current,
        isPro: pro,
        server: outcome,
        url: urlOutcome,
        hasIds: !!(subscriptionId || paymentId),
        elapsedMs: elapsed,
      });
      setState(next.state);
      if (next.state === "pro") {
        queryClient.invalidateQueries({ queryKey: ["usage"] });
        queryClient.invalidateQueries({ queryKey: ["billing-me"] });
      }
      if (next.done) return;
      if (elapsed > GIVE_UP_MS) return; // the webhook still activates Pro later
      timer = setTimeout(tick, elapsed > 60_000 ? POLL_MS * 3 : POLL_MS);
    };

    // A failure in the URL is shown at once, but still confirmed with Dodo.
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [paymentId, queryClient, subscriptionId, urlOutcome]);

  const retry = async () => {
    setRetrying(true);
    try {
      await startProCheckout();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start checkout");
      setRetrying(false);
    }
  };

  const view: Record<State, { icon: React.ReactNode; title: string; text: string; actions: React.ReactNode }> = {
    activating: {
      icon: <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />,
      title: "Payment received",
      text: "Activating Pro on your account…",
      actions: null,
    },
    pro: {
      icon: <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />,
      title: "You're on Pro",
      text: "Unlimited resumes and far more AI are ready to use.",
      actions: (
        <Button className="w-full" asChild>
          <Link href="/dashboard">Go to your resumes</Link>
        </Button>
      ),
    },
    slow: {
      icon: <Clock className="mx-auto h-8 w-8 text-muted-foreground" />,
      title: "Almost there",
      text: "Your payment went through, but activation is taking longer than usual. It usually finishes within a few minutes; your sidebar will show Pro once it does.",
      actions: (
        <Button className="w-full" variant="outline" asChild>
          <Link href="/dashboard">Go to your resumes</Link>
        </Button>
      ),
    },
    processing: {
      icon: <Clock className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400" />,
      title: "Payment processing",
      text: "Your bank is still confirming the payment. This can take a few minutes. Pro turns on automatically once it's confirmed, so you can close this page.",
      actions: (
        <Button className="w-full" variant="outline" asChild>
          <Link href="/dashboard">Go to your resumes</Link>
        </Button>
      ),
    },
    failed: {
      icon: <XCircle className="mx-auto h-8 w-8 text-destructive" />,
      title: "Payment didn't go through",
      text: "Your payment was declined or cancelled, so nothing was charged and you're still on Free. Try again with another card or payment method.",
      actions: (
        <div className="flex flex-col gap-2">
          <Button className="w-full" onClick={retry} disabled={retrying}>
            {retrying && <Loader2 className="h-4 w-4 animate-spin" />}
            Try again
          </Button>
          <Button className="w-full" variant="outline" asChild>
            <Link href="/billing">Back to billing</Link>
          </Button>
        </div>
      ),
    },
    checking: {
      icon: <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />,
      title: "Checking your payment",
      text: "One moment…",
      actions: null,
    },
    not_found: {
      icon: <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />,
      title: "No payment found",
      text: "We couldn't find a completed payment for this page. If you just paid, Pro will turn on within a few minutes; otherwise you can upgrade from Billing.",
      actions: (
        <Button className="w-full" variant="outline" asChild>
          <Link href="/billing">Go to billing</Link>
        </Button>
      ),
    },
  };
  const v = view[state];

  return (
    <Page className="flex min-h-[70dvh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center" aria-live="polite">
        {v.icon}
        <h1 className="mt-4 font-display text-2xl">{v.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{v.text}</p>
        {v.actions && <div className="mt-6">{v.actions}</div>}
      </div>
    </Page>
  );
}

export default function BillingSuccessPage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
