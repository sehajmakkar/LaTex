"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import type { AtsReportV2 } from "@/services/ats/types";
import { categoryTone } from "@/components/ats/score";
import { groupCategories, type ReportView } from "@/components/ats/report-nav";
import { SectionTitle } from "@/components/ats/report-parts";
import { cn } from "@/lib/utils";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 px-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value || <span className="text-red-600 dark:text-red-400">Not found</span>}</dd>
    </div>
  );
}

export function OverviewPanel({ report, onSelect }: { report: AtsReportV2; onSelect: (v: ReportView) => void }) {
  const { fixes } = groupCategories(report.categories);
  const p = report.parsed;
  return (
    <div>
      {report.aiReview !== "complete" && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">
              {report.aiReview === "skipped_quota"
                ? "This scan used the rule-based check only: you've used this month's AI reviews. Pro includes AI feedback, rewrites and job matching on every scan."
                : "The AI review didn't run this time, so bullet feedback and spelling are missing. Run the check again to include them."}
            </p>
          </div>
          {report.aiReview === "skipped_quota" && (
            <Link href="/billing" className="shrink-0 text-sm font-medium underline underline-offset-4">
              Upgrade
            </Link>
          )}
        </div>
      )}

      {report.summary && (
        <>
          <SectionTitle>Summary</SectionTitle>
          <p className="text-sm leading-relaxed">{report.summary}</p>
        </>
      )}
      {report.strengths.length > 0 && (
        <ul className="mt-4 space-y-2">
          {report.strengths.map((s) => (
            <li key={s} className="flex gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {s}
            </li>
          ))}
        </ul>
      )}

      {fixes.length > 0 && (
        <>
          <SectionTitle>Fix these first</SectionTitle>
          <ul className="divide-y rounded-xl border bg-card">
            {fixes.slice(0, 4).map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onSelect(c.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50">
                  <span className={cn("inline-flex min-w-7 justify-center rounded-md px-1.5 py-0.5 font-mono text-xs", categoryTone(c.score))}>
                    {c.score ?? "–"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{c.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.findings.find((f) => f.status !== "pass")?.title ?? c.description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle>What the ATS sees</SectionTitle>
      <p className="mb-3 text-xs text-muted-foreground">
        This is what a parser extracted from your file. Anything missing or wrong here is missing or wrong in the employer&apos;s system too.
      </p>
      <dl className="divide-y rounded-xl border bg-card">
        <Field label="Name" value={p.contact.name} />
        <Field label="Email" value={p.contact.email} />
        <Field label="Phone" value={p.contact.phone} />
        <Field label="Links" value={[p.contact.linkedin, p.contact.website].filter(Boolean).join(" · ")} />
        <Field label="Location" value={p.contact.location} />
        <Field
          label="Sections"
          value={p.sections.map((s) => (s.standard ? s.name : `${s.name} (unrecognised)`)).join(", ")}
        />
        <Field
          label="Experience"
          value={
            p.experience.length > 0 ? (
              <ul className="space-y-1">
                {p.experience.slice(0, 6).map((e, i) => (
                  <li key={i}>
                    <span className="font-medium">{e.title ?? "Role"}</span>
                    {e.company && <span className="text-muted-foreground"> · {e.company}</span>}
                    {e.dates && <span className="text-muted-foreground"> · {e.dates}</span>}
                  </li>
                ))}
              </ul>
            ) : null
          }
        />
        <Field label="Education" value={p.education.map((e) => e.line).join("; ")} />
        <Field
          label="Skills"
          value={
            p.skills.length ? (
              <div className="flex flex-wrap gap-1.5">
                {p.skills.slice(0, 30).map((s) => (
                  <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {s}
                  </span>
                ))}
              </div>
            ) : null
          }
        />
      </dl>
    </div>
  );
}
