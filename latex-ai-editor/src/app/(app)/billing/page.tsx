"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Loader2, Minus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Page, PageHeader } from "@/components/shell/Page";
import { PLANS } from "@/lib/plans";
import { startProCheckout } from "@/lib/client/actions";
import { useUsage } from "@/hooks/use-usage";
import { cn } from "@/lib/utils";

const PRO_PRICE = "$5.99";

type Row = { label: string; free: string | boolean; pro: string | boolean };

const ROWS: Row[] = [
  { label: "Resumes", free: `${PLANS.free.projects}`, pro: "Unlimited" },
  { label: "LaTeX editor, live PDF, all templates", free: true, pro: true },
  { label: "Inline AI edits (⌘K)", free: `${PLANS.free.aiEditsPerMonth} / month`, pro: `${PLANS.pro.aiEditsPerMonth.toLocaleString()} / month` },
  { label: "ATS check", free: true, pro: true },
  { label: "PDF download", free: true, pro: true },
  { label: "AI command bar (coming soon)", free: "Limited", pro: true },
  { label: "Tailor to a job, cover letters (coming soon)", free: false, pro: true },
];

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Pro renews monthly and you can cancel whenever you like; you keep Pro until the end of the period you paid for.",
  },
  {
    q: "What happens to my resumes if I go back to Free?",
    a: "Nothing is deleted. You can open and download all of them; creating new ones needs you to be under the free limit.",
  },
  {
    q: "Is tax included?",
    a: `Yes, ${PRO_PRICE} is the full monthly price. Payments are handled by Dodo Payments, our merchant of record.`,
  },
  {
    q: "Is the ATS check really free?",
    a: "Yes. Parsing and keyword checks are free on every plan; AI suggestions have a monthly allowance on Free.",
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto h-4 w-4" aria-label="Included" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Not included" />;
  return <span className="tabular-nums">{value}</span>;
}

export default function BillingPage() {
  const { data, isLoading } = useUsage();
  const [checkingOut, setCheckingOut] = useState(false);
  const isPro = data?.plan === "pro";

  const upgrade = async () => {
    setCheckingOut(true);
    try {
      await startProCheckout();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start checkout");
      setCheckingOut(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Billing"
        eyebrow={isLoading ? undefined : isPro ? "You're on Pro" : "You're on Free"}
        description="One simple upgrade. Everything you write stays yours on either plan."
      />

      {/* Plans */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Free</h2>
            {!isLoading && !isPro && <span className="rounded-full border px-2.5 py-0.5 text-xs">Current plan</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Build and check a resume properly, for free.</p>
          <p className="mt-6 font-display text-4xl">
            $0<span className="ml-1 text-sm font-normal text-muted-foreground">forever</span>
          </p>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />{PLANS.free.projects} resumes, every template</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />{PLANS.free.aiEditsPerMonth} AI edits a month</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />ATS check and PDF download</li>
          </ul>
          <Button variant="outline" className="mt-6" asChild={!isPro} disabled={isPro}>
            {isPro ? <span>Included with Pro</span> : <Link href="/dashboard">Go to your resumes</Link>}
          </Button>
        </div>

        <div className="flex flex-col rounded-2xl border border-foreground/40 bg-card p-6 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
              <Sparkles className="h-4 w-4" />
              Pro
            </h2>
            {isPro ? (
              <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs text-background">Current plan</span>
            ) : (
              <span className="rounded-full border px-2.5 py-0.5 text-xs">Most popular</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">For an active job search: unlimited resumes and far more AI.</p>
          <p className="mt-6 font-display text-4xl">
            {PRO_PRICE}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ month, tax included</span>
          </p>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />Unlimited resumes</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />{PLANS.pro.aiEditsPerMonth.toLocaleString()} AI edits a month</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />New AI features first: command bar, job tailoring</li>
          </ul>
          {isLoading ? (
            <Skeleton className="mt-6 h-9 rounded-full" />
          ) : isPro ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Status: {data?.subscriptionStatus ?? "active"}. Subscription management (cancel, change card) is coming next.
            </p>
          ) : (
            <Button className="mt-6" onClick={upgrade} disabled={checkingOut}>
              {checkingOut && <Loader2 className="h-4 w-4 animate-spin" />}
              Upgrade to Pro
            </Button>
          )}
        </div>
      </div>

      {/* Comparison */}
      <section className="mt-12" aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="mb-4 font-heading text-base font-semibold">
          Compare plans
        </h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="w-32 px-4 py-3 text-center font-medium">Free</th>
                <th className="w-32 px-4 py-3 text-center font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{row.label}</td>
                  <td className="px-4 py-3 text-center"><Cell value={row.free} /></td>
                  <td className="px-4 py-3 text-center"><Cell value={row.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-12 max-w-3xl" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="mb-4 font-heading text-base font-semibold">
          Questions
        </h2>
        <div className="divide-y rounded-2xl border">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group px-4 py-3">
              <summary className={cn("cursor-pointer list-none text-sm font-medium", "flex items-center justify-between")}>
                {q}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </Page>
  );
}
