"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUsage } from "@/hooks/use-usage";
import { cn } from "@/lib/utils";

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">
          {used}
          <span className="text-muted-foreground"> / {limit}</span>
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-sidebar-accent">
        <div
          className={cn("h-full rounded-full", pct >= 100 ? "bg-destructive" : "bg-foreground/70")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Sidebar card: current plan, this month's usage, and the upgrade entry point. */
export function PlanCard({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useUsage();
  if (!data) {
    return <div className="h-[118px] animate-pulse rounded-xl border border-sidebar-border" aria-hidden />;
  }

  if (data.plan === "pro") {
    return (
      <Link
        href="/billing"
        onClick={onNavigate}
        className="flex items-center justify-between rounded-xl border border-sidebar-border px-3 py-2.5 text-xs hover:bg-sidebar-accent/60"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          Pro plan
        </span>
        <span className="text-muted-foreground">
          {data.usage.aiEdits} / {data.limits.aiEditsPerMonth} AI edits
        </span>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-sidebar-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Free plan</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">This month</span>
      </div>
      <Meter label="Resumes" used={data.usage.projects} limit={data.limits.projects} />
      <Meter label="AI edits" used={data.usage.aiEdits} limit={data.limits.aiEditsPerMonth} />
      <Meter label="AI commands" used={data.usage.aiCommands} limit={data.limits.aiCommandsPerMonth} />
      <Button size="sm" className="h-8 rounded-full" asChild>
        <Link href="/billing" onClick={onNavigate}>
          <Sparkles className="h-3.5 w-3.5" />
          Upgrade to Pro
        </Link>
      </Button>
    </div>
  );
}
