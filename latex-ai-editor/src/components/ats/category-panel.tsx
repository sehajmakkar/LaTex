"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Copy, Lightbulb, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BulletFix, Category } from "@/services/ats/types";
import { ScoreRing } from "@/components/ats/score";
import { FindingList, Locked, SectionTitle } from "@/components/ats/report-parts";

/** Link that opens the resume in the editor with this bullet selected and the ⌘K prompt pre-filled. */
export function fixInEditorHref(projectId: string, original: string, prompt: string) {
  return `/project/${projectId}?fix=${encodeURIComponent(original)}&prompt=${encodeURIComponent(prompt)}`;
}

function BulletFixCard({ fix, projectId }: { fix: BulletFix; projectId: string | null }) {
  const copy = async () => {
    if (!fix.prompt) return;
    await navigator.clipboard.writeText(fix.prompt).catch(() => {});
    toast.success("Prompt copied", { description: "Select the bullet in the editor, press ⌘K and paste." });
  };
  return (
    <li className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{fix.original}</p>
      {fix.issues.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {fix.issues.map((issue) => (
            <span key={issue} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {issue}
            </span>
          ))}
        </div>
      )}
      {fix.locked ? (
        <div className="mt-3">
          <Locked label="See the rewrite and prompt with Pro" />
        </div>
      ) : (
        <>
          {fix.rewrite && (
            <div className="mt-3 rounded-lg bg-emerald-500/5 p-3">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Suggested rewrite</p>
              <p className="text-sm">{fix.rewrite}</p>
            </div>
          )}
          {fix.prompt && (
            <div className="mt-3 rounded-lg border border-dashed p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Wand2 className="h-3 w-3" /> Prompt for the editor&apos;s AI (⌘K)
              </p>
              <p className="text-sm">{fix.prompt}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {projectId && (
                  <Button size="sm" asChild>
                    <Link href={fixInEditorHref(projectId, fix.original, fix.prompt)}>
                      Fix in editor <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={copy}>
                  <Copy className="h-3.5 w-3.5" /> Copy prompt
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
}

export function CategoryPanel({ category, projectId }: { category: Category; projectId: string | null }) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-tight">{category.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
        </div>
        <ScoreRing score={category.score} max={10} size={64} />
      </div>

      <SectionTitle>What we found</SectionTitle>
      <FindingList findings={category.findings} />

      {category.items && category.items.length > 0 && (
        <>
          <SectionTitle>Details</SectionTitle>
          <ul className="space-y-2">
            {category.items.map((item, i) =>
              item.locked ? (
                <li key={i}>
                  <Locked compact lines={1} />
                </li>
              ) : (
                <li key={i} className="rounded-lg border bg-card px-3 py-2 text-sm">
                  <span>{item.label}</span>
                  {item.note && <span className="ml-2 text-muted-foreground">{item.note}</span>}
                </li>
              )
            )}
          </ul>
        </>
      )}

      {category.bulletFixes && category.bulletFixes.length > 0 && (
        <>
          <SectionTitle>Bullets to improve</SectionTitle>
          {!projectId && (
            <p className="mb-3 text-xs text-muted-foreground">
              This was an uploaded file, so edit it where you made it, or rebuild it in a Vero template to use one-click fixes.
            </p>
          )}
          <ul className="space-y-3">
            {category.bulletFixes.map((fix, i) => (
              <BulletFixCard key={i} fix={fix} projectId={projectId} />
            ))}
          </ul>
        </>
      )}

      {category.tip && (
        <div className="mt-8 flex gap-3 rounded-xl bg-muted/60 p-4 text-sm">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p>{category.tip}</p>
        </div>
      )}
    </div>
  );
}
