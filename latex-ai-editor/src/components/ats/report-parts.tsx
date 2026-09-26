"use client";

import Link from "next/link";
import { CheckCircle2, CircleAlert, Lock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckStatus, Finding } from "@/services/ats/types";
import { cn } from "@/lib/utils";

export function StatusIcon({ status, className }: { status: CheckStatus; className?: string }) {
  if (status === "pass") return <CheckCircle2 className={cn("h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400", className)} aria-label="Pass" />;
  if (status === "warn") return <CircleAlert className={cn("h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400", className)} aria-label="Warning" />;
  return <XCircle className={cn("h-4 w-4 shrink-0 text-red-600 dark:text-red-400", className)} aria-label="Issue" />;
}

export function FindingList({ findings }: { findings: Finding[] }) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {findings.map((f, i) => (
        <li key={i} className="flex gap-3 px-4 py-3">
          <StatusIcon status={f.status} className="mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{f.title}</p>
            {f.detail && <p className="mt-0.5 break-words text-sm text-muted-foreground">{f.detail}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Placeholder for Pro-only content. The real text never reaches the browser
 * (the API redacts it); this only suggests its shape.
 */
export function Locked({ label = "Unlock with Pro", lines = 2, compact }: { label?: string; lines?: number; compact?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-dashed", compact ? "px-3 py-2" : "p-4")}>
      <div className="select-none space-y-2 blur-[3px]" aria-hidden>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="h-2.5 rounded-full bg-muted-foreground/25" style={{ width: `${[92, 76, 84][i % 3]}%` }} />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/40">
        <Button size="sm" variant="secondary" className="h-7 gap-1.5 text-xs" asChild>
          <Link href="/billing">
            <Lock className="h-3 w-3" />
            {label}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wider text-muted-foreground first:mt-0">{children}</h3>;
}
