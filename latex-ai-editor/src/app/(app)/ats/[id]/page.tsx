"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2, Lock, PenLine, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocxPreview } from "@/components/ats/DocxPreview";
import { ScoreRing, scoreTone } from "@/components/ats/score";
import { ReportNav, groupCategories, type ReportView } from "@/components/ats/report-nav";
import { OverviewPanel } from "@/components/ats/overview-panel";
import { CategoryPanel } from "@/components/ats/category-panel";
import { JobMatchPanel } from "@/components/ats/job-match-panel";
import type { AtsReportV2 } from "@/services/ats/types";
import { cn } from "@/lib/utils";

type ReportResponse = {
  id: string;
  createdAt: string;
  source: string;
  projectId: string | null;
  fileName: string | null;
  hasFile: boolean;
  fileMimeType: string | null;
  resumeText: string;
  plan: "free" | "pro";
  report: AtsReportV2 | null;
  legacy: boolean;
};

const GROUP_LABELS = { parsing: "ATS parsing", impact: "Impact", style: "Brevity & style" } as const;

function Preview({ data }: { data: ReportResponse }) {
  const url = `/api/ats/reports/${data.id}/file`;
  const isDocx = data.fileMimeType?.includes("wordprocessingml") || data.fileName?.toLowerCase().endsWith(".docx");
  if (data.hasFile && isDocx) return <DocxPreview fileUrl={url} className="h-full" />;
  if (data.hasFile && data.fileMimeType === "application/pdf") return <iframe src={url} title="Resume preview" className="h-full w-full border-0" />;
  return <pre className="h-full overflow-auto whitespace-pre-wrap break-words p-4 text-xs">{data.resumeText}</pre>;
}

export default function AtsReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ReportResponse | null>(null);
  const [view, setView] = useState<ReportView>("overview");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ats/reports/${id}`)
      .then(async (res) => {
        if (res.status === 401) return router.push("/sign-in");
        if (!res.ok) return router.push("/ats");
        const json = await res.json();
        if (!cancelled) setData(json.data);
      })
      .catch(() => router.push("/ats"));
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const report = data?.report ?? null;
  const selected = useMemo(() => report?.categories.find((c) => c.id === view) ?? null, [report, view]);

  if (!data) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center md:h-dvh">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.legacy || !report) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 text-center md:h-dvh">
        <ScanSearch className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="font-heading text-lg font-semibold">This report uses the old ATS check</h1>
          <p className="mt-1 text-sm text-muted-foreground">Run a new check to see the full report with job matching and fixes.</p>
        </div>
        <Button asChild>
          <Link href={data.projectId ? `/ats?project=${data.projectId}` : "/ats"}>Run a new check</Link>
        </Button>
      </div>
    );
  }

  const title = data.fileName?.replace(/\.pdf$/i, "") ?? "Resume";
  const { fixes } = groupCategories(report.categories);

  return (
    <div className="flex flex-col md:h-dvh">
      {/* Header */}
      <header className="border-b px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link href="/ats" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> ATS check
            </Link>
            <h1 className="truncate font-display text-xl tracking-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(data.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} ·{" "}
              {data.source === "editor" ? "Vero resume" : `Uploaded ${data.source.replace("upload_", "").toUpperCase()}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {data.projectId && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/project/${data.projectId}`}>
                  <PenLine className="h-3.5 w-3.5" /> Open in editor
                </Link>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link href={data.projectId ? `/ats?project=${data.projectId}` : "/ats"}>
                <ScanSearch className="h-3.5 w-3.5" /> New check
              </Link>
            </Button>
          </div>
        </div>

        {/* Score strip */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <ScoreRing score={report.overall} size={64} />
            <div>
              <p className="text-sm font-medium">ATS score</p>
              <p className="text-xs text-muted-foreground">{fixes.length ? `${fixes.length} area${fixes.length > 1 ? "s" : ""} to improve` : "Looking strong"}</p>
            </div>
          </div>
          <div className="flex gap-5">
            {(Object.keys(GROUP_LABELS) as (keyof typeof GROUP_LABELS)[]).map((g) => (
              <div key={g}>
                <p className="text-[11px] text-muted-foreground">{GROUP_LABELS[g]}</p>
                <p className={cn("font-display text-lg tabular-nums", scoreTone(report.groupScores[g]))}>{report.groupScores[g]}</p>
              </div>
            ))}
          </div>
          {report.jobMatch && (
            <button type="button" onClick={() => setView("job-match")} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-left hover:bg-accent/50">
              <ScoreRing score={report.jobMatch.score} size={48} />
              <div>
                <p className="text-sm font-medium">Job match</p>
                <p className="text-xs text-muted-foreground">{report.jobMatch.score >= 75 ? "Strong match" : "Aim for 75%+"}</p>
              </div>
            </button>
          )}
          {report.redacted && (
            <Link href="/billing" className="ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:bg-accent/50">
              <Lock className="h-3 w-3" /> Some details are Pro-only · Upgrade
            </Link>
          )}
        </div>
      </header>

      {/* Mobile section picker */}
      <div className="flex items-center gap-2 border-b px-4 py-3 md:hidden">
        <select
          value={view}
          onChange={(e) => setView(e.target.value)}
          aria-label="Report section"
          className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="overview">Overview</option>
          {report.jobMatch && <option value="job-match">Job match · {report.jobMatch.score}%</option>}
          {report.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} · {c.score ?? "–"}/10
            </option>
          ))}
        </select>
        {data.hasFile && (
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/ats/reports/${data.id}/file`} target="_blank" rel="noreferrer">
              <FileText className="h-3.5 w-3.5" /> Resume
            </a>
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="grid min-h-0 flex-1 md:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,0.85fr)]">
        <aside className="hidden overflow-y-auto border-r p-3 md:block">
          <ReportNav report={report} view={view} onSelect={setView} />
        </aside>
        <section className="min-w-0 overflow-y-auto px-4 py-6 md:px-8">
          {view === "overview" && <OverviewPanel report={report} onSelect={setView} />}
          {view === "job-match" && report.jobMatch && <JobMatchPanel match={report.jobMatch} />}
          {selected && <CategoryPanel category={selected} projectId={data.projectId} />}
        </section>
        <aside className="hidden min-h-0 border-l bg-muted/40 xl:block" aria-label="Resume preview">
          <Preview data={data} />
        </aside>
      </div>
    </div>
  );
}
