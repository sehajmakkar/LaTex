"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ATSSection } from "@/services/ats/ats-service";

type ReportSectionProps = {
  section: ATSSection;
  plan: string; // "free" | "pro" | "pro_plus"
};

export function ReportSection({ section, plan }: ReportSectionProps) {
  const locked = section.tier === "pro" && plan === "free";

  return (
    <div className="rounded-xl border bg-card p-3 text-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium capitalize">
            {section.name.replace(/_/g, " ")}
          </span>
          <span className="text-xs text-muted-foreground">
            {section.score}/100 · {section.status}
          </span>
        </div>
        {section.tier === "pro" && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
            Pro insight
          </span>
        )}
      </div>

      {locked ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Detailed insights for this section are available on the Pro plan.
          </p>
          <Button asChild size="sm" className="gap-1 rounded-full text-xs px-3 py-1.5">
            <a href="/billing">
              <Lock className="h-3 w-3" />
              Upgrade
            </a>
          </Button>
        </div>
      ) : section.findings.length > 0 ? (
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          {section.findings.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          This section looks good. No major issues detected.
        </p>
      )}
    </div>
  );
}

