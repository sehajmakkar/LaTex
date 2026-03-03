"use client";

import { Lock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KeywordAnalysis } from "@/services/ats/ats-service";

type KeywordAnalysisProps = {
  keywords?: KeywordAnalysis;
  plan: string;
};

export function KeywordAnalysisView({ keywords, plan }: KeywordAnalysisProps) {
  if (!keywords) return null;

  const locked = keywords.tier === "pro" && plan === "free";

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
            <Target className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-medium">Job match & keywords</p>
            <p className="text-xs text-muted-foreground">
              How well your resume matches the job description.
            </p>
          </div>
        </div>
      </div>

      {locked ? (
        <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <span>
            Detailed keyword and JD match insights are available on the Pro plan.
          </span>
          <Button asChild size="sm" className="gap-1 rounded-full text-xs px-3 py-1.5">
            <a href="/billing">
              <Lock className="h-3 w-3" />
              Upgrade
            </a>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Match score: <span className="font-mono text-foreground">{keywords.score}%</span>
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-foreground">Matched keywords</p>
              {keywords.found.length ? (
                <div className="flex flex-wrap gap-1">
                  {keywords.found.map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No clear keyword matches found.</p>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-foreground">Missing keywords</p>
              {keywords.missing.length ? (
                <div className="flex flex-wrap gap-1">
                  {keywords.missing.map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-800 dark:bg-rose-900/40 dark:text-rose-100"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No obvious missing keywords.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

