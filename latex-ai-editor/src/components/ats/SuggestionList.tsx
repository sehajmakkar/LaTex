"use client";

import { Lightbulb, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ATSSuggestion } from "@/services/ats/ats-service";

type SuggestionListProps = {
  suggestions: ATSSuggestion[];
  plan: string;
};

export function SuggestionList({ suggestions, plan }: SuggestionListProps) {
  if (!suggestions.length) {
    return null;
  }

  const visible = suggestions.filter(
    (s) => s.tier === "free" || plan !== "free"
  );
  const lockedCount =
    plan === "free"
      ? suggestions.filter((s) => s.tier === "pro").length
      : 0;

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
            <Lightbulb className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-medium">Suggestions to improve</p>
            <p className="text-xs text-muted-foreground">
              Apply these in the TeXel editor to raise your score.
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        {visible.map((s, idx) => (
          <li
            key={`${s.text}-${idx}`}
            className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-foreground"
          >
            <span className="mr-2 inline-flex rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {s.priority}
            </span>
            {s.text}
          </li>
        ))}
      </ul>

      {lockedCount > 0 && plan === "free" && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <span>{lockedCount} more suggestions available on Pro.</span>
          <Button asChild size="sm" className="gap-1 rounded-full text-xs px-3 py-1.5">
            <a href="/billing">
              <Lock className="h-3 w-3" />
              Upgrade
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

