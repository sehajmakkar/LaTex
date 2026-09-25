"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/shell/Page";

const POLL_MS = 2_000;
const MAX_WAIT_MS = 30_000;

/**
 * Dodo redirects here right after payment, but the plan only changes when its
 * webhook arrives, so poll until the account shows Pro (or give up politely).
 */
export default function BillingSuccessPage() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<"waiting" | "pro" | "slow">("waiting");

  useEffect(() => {
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      const res = await fetch("/api/usage").catch(() => null);
      const plan = res?.ok ? (await res.json()).data?.plan : null;
      if (plan === "pro") {
        setState("pro");
        queryClient.invalidateQueries({ queryKey: ["usage"] });
        return;
      }
      if (Date.now() - started > MAX_WAIT_MS) return setState("slow");
      timer = setTimeout(check, POLL_MS);
    };
    check();
    return () => clearTimeout(timer);
  }, [queryClient]);

  return (
    <Page className="flex min-h-[70dvh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center">
        {state === "waiting" && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl">Payment received</h1>
            <p className="mt-2 text-sm text-muted-foreground">Activating Pro on your account…</p>
          </>
        )}
        {state === "pro" && (
          <>
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            <h1 className="mt-4 font-display text-2xl">You&apos;re on Pro</h1>
            <p className="mt-2 text-sm text-muted-foreground">Unlimited resumes and far more AI edits are ready to use.</p>
            <Button className="mt-6 w-full" asChild>
              <Link href="/dashboard">Go to your resumes</Link>
            </Button>
          </>
        )}
        {state === "slow" && (
          <>
            <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl">Almost there</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your payment went through, but activation is taking longer than usual. It usually finishes within a few minutes;
              your sidebar will show Pro once it does.
            </p>
            <Button className="mt-6 w-full" variant="outline" asChild>
              <Link href="/dashboard">Go to your resumes</Link>
            </Button>
          </>
        )}
      </div>
    </Page>
  );
}
