"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, FileUp, Loader2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, Page, PageHeader } from "@/components/shell/Page";
import { cn } from "@/lib/utils";

type ProjectSummary = { id: string; name: string };

type ReportSummary = {
  id: string;
  score: number;
  parseScore: number;
  qualityScore: number;
  createdAt: string;
  source: string;
  projectId: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  editor: "Vero resume",
  upload_pdf: "PDF upload",
  upload_docx: "DOCX upload",
  upload_txt: "Text upload",
};

function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function AtsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [projectId, setProjectId] = useState(params.get("project") ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [showJd, setShowJd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("resume");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/projects"), fetch("/api/ats/reports")])
      .then(async ([p, r]) => {
        if (p.status === 401 || r.status === 401) return router.push("/sign-in?redirect_url=/ats");
        const projectList = p.ok ? (((await p.json()).data as ProjectSummary[]) ?? []) : [];
        const reportList = r.ok ? (((await r.json()).data as ReportSummary[]) ?? []) : [];
        if (cancelled) return;
        setProjects(projectList.map(({ id, name }) => ({ id, name })));
        setReports(reportList);
        if (projectList.length === 0) setTab("upload");
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([]);
          setReports([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const analyze = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, jobDescription: jobDescription.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error?.message ?? "The ATS check failed");
      router.push(`/ats/${json.data.id}`);
    },
    [jobDescription, router]
  );

  const handleScanProject = useCallback(async () => {
    if (!projectId) return toast.error("Choose a resume to check.");
    setBusy(true);
    try {
      await analyze({ source: "editor", projectId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The ATS check failed");
      setBusy(false);
    }
  }, [projectId, analyze]);

  const handleScanUpload = useCallback(async () => {
    if (!file) return toast.error("Choose a PDF, DOCX or TXT file.");
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ats/upload", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error?.message ?? "Upload failed");
      if (!json.data?.text) throw new Error("We couldn't read any text from that file.");
      await analyze({
        source: "upload",
        text: json.data.text,
        upload: json.data.storageKey
          ? { storageKey: json.data.storageKey, fileName: json.data.fileName, mimeType: json.data.mimeType, source: json.data.source }
          : undefined,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The ATS check failed");
      setBusy(false);
    }
  }, [file, analyze]);

  return (
    <Page>
      <PageHeader
        title="ATS check"
        description="See how applicant tracking systems read your resume, and what to fix. Free for every account."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Scan panel */}
        <section className="rounded-2xl border bg-card p-5 md:p-6" aria-labelledby="scan-heading">
          <h2 id="scan-heading" className="mb-4 font-heading text-base font-semibold">
            Scan a resume
          </h2>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-5">
              <TabsTrigger value="resume">One of my resumes</TabsTrigger>
              <TabsTrigger value="upload">Upload a file</TabsTrigger>
            </TabsList>

            <TabsContent value="resume" className="flex flex-col gap-4">
              {projects === null ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have any resumes yet.{" "}
                  <Link href="/templates" className="text-foreground underline underline-offset-4">
                    Start from a template
                  </Link>{" "}
                  or upload a file instead.
                </p>
              ) : (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Resume</span>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    <option value="">Choose a resume…</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </TabsContent>

            <TabsContent value="upload" className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors hover:border-ring/60"
              >
                <FileUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{file ? file.name : "Choose a resume file"}</span>
                <span className="text-xs text-muted-foreground">PDF, DOCX or TXT · up to 5 MB</span>
              </button>
            </TabsContent>
          </Tabs>

          <div className="mt-5 border-t pt-4">
            <button
              type="button"
              onClick={() => setShowJd((v) => !v)}
              className="flex w-full items-center justify-between text-sm"
              aria-expanded={showJd}
            >
              <span>
                Add a job description <span className="text-muted-foreground">(optional, for keyword match)</span>
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showJd && "rotate-180")} />
            </button>
            {showJd && (
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                maxLength={10_000}
                placeholder="Paste the job description…"
                className="mt-3 h-32 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            )}
          </div>

          <Button
            className="mt-5 w-full"
            onClick={tab === "resume" ? handleScanProject : handleScanUpload}
            disabled={busy || (tab === "resume" ? !projectId : !file)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            {busy ? "Checking… (about 10 s)" : "Run ATS check"}
          </Button>
        </section>

        {/* Recent reports */}
        <section aria-labelledby="reports-heading">
          <h2 id="reports-heading" className="mb-4 font-heading text-base font-semibold">
            Recent reports
          </h2>
          {reports === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <EmptyState title="No reports yet" description="Run your first check and it will appear here." />
          ) : (
            <ul className="divide-y rounded-2xl border">
              {reports.map((r) => (
                <li key={r.id}>
                  <Link href={`/ats/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{SOURCE_LABEL[r.source] ?? r.source}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <span className={cn("font-display text-xl tabular-nums", scoreTone(r.score))}>{r.score}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}

export default function AtsIndexPage() {
  return (
    <Suspense>
      <AtsPage />
    </Suspense>
  );
}
