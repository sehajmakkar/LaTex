"use client";

import { Lightbulb } from "lucide-react";
import type { JobMatch, Requirement } from "@/services/ats/types";
import { ScoreRing } from "@/components/ats/score";
import { Locked, SectionTitle, StatusIcon } from "@/components/ats/report-parts";

const KIND_LABEL: Record<Requirement["kind"], string> = {
  hard: "Hard skill",
  tool: "Tool",
  soft: "Soft skill",
  certification: "Certification",
  education: "Education",
};

function RequirementRow({ r }: { r: Requirement }) {
  if (r.locked) {
    return (
      <li className="px-4 py-3">
        <Locked compact lines={1} label="See all missing keywords with Pro" />
      </li>
    );
  }
  return (
    <li className="flex gap-3 px-4 py-3">
      <StatusIcon status={r.status === "exact" ? "pass" : r.status === "semantic" ? "warn" : "fail"} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{r.skill}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{KIND_LABEL[r.kind]}</span>
          {r.status === "semantic" && <span className="text-[11px] text-amber-700 dark:text-amber-400">Implied, not named</span>}
        </div>
        {r.evidence ? (
          <p className="mt-1 truncate text-xs text-muted-foreground" title={r.evidence}>
            “{r.evidence}”
          </p>
        ) : r.status === "missing" ? (
          <p className="mt-1 text-xs text-muted-foreground">Not found in your resume</p>
        ) : null}
      </div>
    </li>
  );
}

export function JobMatchPanel({ match }: { match: JobMatch }) {
  const groups = (["required", "preferred"] as const).map((importance) => ({
    importance,
    items: match.requirements.filter((r) => r.importance === importance),
  }));
  const missingRequired = match.requirements.filter((r) => r.importance === "required" && r.status === "missing").length;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-tight">Job match</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {match.source === "target_role"
              ? `Compared with what typical ${match.roleTitle ?? "target role"} job descriptions ask for.`
              : `How well your resume covers what this ${match.roleTitle ? `${match.roleTitle} ` : ""}job screens for. Aim for 75% or more.`}
          </p>
          {match.method === "keywords" && (
            <p className="mt-2 text-xs text-muted-foreground">Basic keyword match. The AI job match (synonyms and implied skills) wasn&apos;t included in this scan.</p>
          )}
        </div>
        <ScoreRing score={match.score} label="%" />
      </div>

      {match.summary && <p className="mb-6 rounded-xl bg-muted/60 p-4 text-sm">{match.summary}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {match.roleTitle && (
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <StatusIcon status={match.titleMatch ? "pass" : "warn"} />
            <div>
              <p className="text-sm font-medium">Job title</p>
              <p className="text-xs text-muted-foreground">
                {match.titleMatch ? `Your resume mentions "${match.roleTitle}"` : `Add "${match.roleTitle}" (or close wording) to your summary or headline`}
              </p>
            </div>
          </div>
        )}
        {match.yearsRequired && (
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <StatusIcon status={match.yearsFound !== null && match.yearsFound >= match.yearsRequired ? "pass" : "warn"} />
            <div>
              <p className="text-sm font-medium">Experience</p>
              <p className="text-xs text-muted-foreground">
                Asks for {match.yearsRequired}+ years · your dates show {match.yearsFound ?? "unclear"}
                {match.yearsFound !== null ? " years" : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <div key={g.importance}>
              <SectionTitle>
                {g.importance === "required" ? "Required" : "Nice to have"} ·{" "}
                {g.items.filter((r) => r.status !== "missing").length}/{g.items.length} covered
              </SectionTitle>
              <ul className="divide-y rounded-xl border bg-card">
                {g.items.map((r, i) => (
                  <RequirementRow key={`${r.skill}-${i}`} r={r} />
                ))}
              </ul>
            </div>
          )
      )}

      <div className="mt-8 flex gap-3 rounded-xl bg-muted/60 p-4 text-sm">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p>
          {missingRequired > 0
            ? `You're missing ${missingRequired} required item${missingRequired > 1 ? "s" : ""}. If you have them, name them exactly as the job does: in Skills, and in a bullet that shows where you used them. Only add what's true; interviews will test it.`
            : "You cover the required items. Mirror the job's exact wording for your strongest matches, and put the most important ones near the top."}
        </p>
      </div>
    </div>
  );
}
