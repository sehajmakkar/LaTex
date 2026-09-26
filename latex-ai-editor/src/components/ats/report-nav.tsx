"use client";

import { LayoutDashboard, Lock, Target } from "lucide-react";
import type { AtsReportV2, Category } from "@/services/ats/types";
import { categoryTone } from "@/components/ats/score";
import { cn } from "@/lib/utils";

export type ReportView = "overview" | "job-match" | string;

/** Categories scoring below 8/10 are "Top fixes", worst first; the rest are "Completed". */
export function groupCategories(categories: Category[]) {
  const scored = categories.filter((c) => c.score !== null);
  return {
    fixes: [...scored.filter((c) => (c.score as number) < 8).sort((a, b) => (a.score as number) - (b.score as number)), ...categories.filter((c) => c.score === null)],
    completed: scored.filter((c) => (c.score as number) >= 8).sort((a, b) => (b.score as number) - (a.score as number)),
  };
}

function Row({ active, onClick, children, badge }: { active: boolean; onClick: () => void; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      <span className="flex min-w-0 items-center gap-2 truncate">{children}</span>
      {badge}
    </button>
  );
}

function Badge({ score }: { score: number | null }) {
  return (
    <span className={cn("inline-flex min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums", categoryTone(score))}>
      {score === null ? <Lock className="h-3 w-3" /> : score}
    </span>
  );
}

export function ReportNav({ report, view, onSelect }: { report: AtsReportV2; view: ReportView; onSelect: (v: ReportView) => void }) {
  const { fixes, completed } = groupCategories(report.categories);
  return (
    <nav aria-label="Report sections" className="flex flex-col gap-1">
      <Row active={view === "overview"} onClick={() => onSelect("overview")}>
        <LayoutDashboard className="h-4 w-4 shrink-0" /> Overview
      </Row>
      {report.jobMatch && (
        <Row active={view === "job-match"} onClick={() => onSelect("job-match")} badge={<Badge score={Math.round(report.jobMatch.score / 10)} />}>
          <Target className="h-4 w-4 shrink-0" /> Job match
        </Row>
      )}
      {fixes.length > 0 && <p className="mt-4 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Top fixes</p>}
      {fixes.map((c) => (
        <Row key={c.id} active={view === c.id} onClick={() => onSelect(c.id)} badge={<Badge score={c.score} />}>
          {c.title}
        </Row>
      ))}
      {completed.length > 0 && <p className="mt-4 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Completed</p>}
      {completed.map((c) => (
        <Row key={c.id} active={view === c.id} onClick={() => onSelect(c.id)} badge={<Badge score={c.score} />}>
          {c.title}
        </Row>
      ))}
    </nav>
  );
}
