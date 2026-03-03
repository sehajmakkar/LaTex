"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, FileCode2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { FREE_PROJECT_LIMIT } from "@/lib/constants";

const PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for trying out TeXel",
    price: "$0",
    period: "forever",
    features: [
      "LaTeX editor with live preview",
      `${FREE_PROJECT_LIMIT} resume projects`,
      "Basic templates",
      "Export to PDF",
      "Community support",
    ],
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For serious job seekers and writers",
    price: "$3.99",
    period: "/month",
    features: [
      "Unlimited projects",
      "Inline AI editing",
      "All professional templates",
      "Export to PDF",
      "Priority support",
      "Version history",
    ],
    highlighted: true,
  },
  {
    id: "pro_plus",
    name: "Pro Plus",
    description: "For power users and teams",
    price: "$29.99",
    period: "/month",
    features: [
      "Everything in Pro",
      "Unlimited projects & templates",
      "Custom LaTeX packages",
      "Dedicated support",
      "Early access to new features",
    ],
    highlighted: false,
  },
] as const;

export default function BillingPage() {
  const { isLoaded } = useUser();
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
        toast.error(json.error?.message ?? "Failed to start checkout");
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
      <DashboardNav
        rightContent={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        }
      />

      <main className="flex-1 overflow-auto px-6 py-8">
        <div className="mx-auto max-w-5xl">
          {/* Section Header */}
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Pricing
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-muted-foreground">
              Start free. Upgrade when you need more projects and AI editing.
            </p>
            {subscriptionStatus && (
              <p className="mt-2 text-sm text-muted-foreground">
                Current subscription: <strong>{subscriptionStatus}</strong>
              </p>
            )}
          </div>

          {/* Pricing Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((p) => {
              const isCurrentPlan = plan === p.id;
              const isPaidPlan = p.id === "pro" || p.id === "pro_plus";
              const isCheckoutLoading =
                isPaidPlan && checkoutPlan === p.id;

              return (
                <div
                  key={p.id}
                  className={`flex h-full flex-col rounded-2xl border p-8 ${
                    p.highlighted
                      ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  {/* Plan Header */}
                  <div className="mb-6">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="font-heading text-xl font-semibold text-foreground">
                        {p.name}
                      </h2>
                      {isCurrentPlan && (
                        <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
                          Current plan
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="font-display text-4xl font-bold text-foreground">
                      {p.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {p.period}
                    </span>
                  </div>

                  {/* Features */}
                  <ul className="mb-8 flex-1 space-y-3">
                    {p.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="mt-auto">
                    {p.id === "free" ? (
                      isCurrentPlan ? (
                        <Button
                          variant="outline"
                          className="w-full rounded-full"
                          disabled
                        >
                          Current plan
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full rounded-full"
                          asChild
                        >
                          <Link href="/dashboard">Start writing free</Link>
                        </Button>
                      )
                    ) : isCurrentPlan ? (
                      <Button
                        variant="secondary"
                        className="w-full rounded-full"
                        disabled
                      >
                        Current plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full rounded-full"
                        variant={p.highlighted ? "default" : "secondary"}
                        disabled={!!checkoutPlan}
                        onClick={() =>
                          handleUpgrade(p.id as "pro" | "pro_plus")
                        }
                      >
                        {isCheckoutLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          `Upgrade to ${p.name}`
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
