"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileCode2, CreditCard, Loader2, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default function BillingPage() {
  const { user, isLoaded } = useUser();
  const [plan, setPlan] = useState<string>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<"pro" | "pro_plus" | null>(
    null
  );

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/me");
        if (res.ok) {
          const { data } = await res.json();
          if (!cancelled) {
            setPlan(data?.plan ?? "free");
            setSubscriptionStatus(data?.subscriptionStatus ?? null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded]);

  const handleUpgrade = async (targetPlan: "pro" | "pro_plus") => {
    setCheckoutPlan(targetPlan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(
          json.error?.message ?? "Failed to start checkout"
        );
        return;
      }
      const url = json.data?.checkout_url;
      if (url) {
        window.location.href = url;
        return;
      }
      toast.error("No checkout URL returned");
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setCheckoutPlan(null);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b border-border bg-background/70 px-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
              <FileCode2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="font-display font-semibold">TeXel</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            {user?.firstName ?? "User"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <SignOutButton>
            <Button variant="ghost" size="sm">
              Sign out
            </Button>
          </SignOutButton>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-xl font-semibold">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your plan and billing via Dodo Payments.
          </p>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current plan
              </CardTitle>
              <CardDescription>
                You are on the <strong>{plan}</strong> plan
                {subscriptionStatus ? ` (${subscriptionStatus})` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan === "free" && (
                <p className="text-sm text-muted-foreground">
                  Upgrade to unlock more projects and features.
                </p>
              )}
            </CardContent>
          </Card>

          {plan !== "pro_plus" && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Upgrade</CardTitle>
                <CardDescription>
                  Choose a plan below. You will be redirected to Dodo Payments to
                  complete checkout.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {plan !== "pro" && (
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Zap className="h-4 w-4" />
                        Pro
                      </CardTitle>
                      <CardDescription>
                        More projects and priority support.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full"
                        disabled={!!checkoutPlan}
                        onClick={() => handleUpgrade("pro")}
                      >
                        {checkoutPlan === "pro" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Upgrade to Pro"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4" />
                      Pro Plus
                    </CardTitle>
                    <CardDescription>
                      Unlimited projects and all features.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant={plan === "pro" ? "default" : "secondary"}
                      className="w-full"
                      disabled={!!checkoutPlan}
                      onClick={() => handleUpgrade("pro_plus")}
                    >
                      {checkoutPlan === "pro_plus" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Upgrade to Pro Plus"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
