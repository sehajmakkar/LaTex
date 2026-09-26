"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, FileUp, Loader2, ScanSearch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, Page, PageHeader } from "@/components/shell/Page";
import { useUsage } from "@/hooks/use-usage";
import { cn } from "@/lib/utils";
import { scoreTone } from "@/components/ats/score";

type ProjectSummary = { id: string; name: string };
type ReportSummary = {
  id: string;
  score: number;
  qualityScore: number;
  createdAt: string;
  source: string;
  fileName: string | null;
  hasJob: boolean;
};

const STEPS = {
  project: ["Compiling your resume to PDF…", "Reading it like an ATS…", "Checking content and job match…"],
  upload: ["Uploading…", "Reading it like an ATS…", "Checking content and job match…"],
};

function AtsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { data: usage } = useUsage();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [tab, setTab] = useState("resume");
  const [projectId, setProjectId] = useState(params.get("project") ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [step, setStep] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/projects"), fetch("/api/ats/reports")])
      .then(async ([p, r]) => {
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
  }, []);

  const run = useCallback(async () => {
    const isProject = tab === "resume";
    if (isProject && !projectId) return toast.error("Choose a resume to check.");
    if (!isProject && !file) return toast.error("Choose a PDF, DOCX or TXT file.");

    setStep(0);
    const timers = [setTimeout(() => setStep(1), 2500), setTimeout(() => setStep(2), 5000)];
    try {
      let res: Response;
      if (isProject) {
        res = await fetch("/api/ats/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, jobDescription: jobDescription || undefined, targetRole: targetRole || undefined }),
        });
      } else {
        const form = new FormData();
        form.append("file", file!);
        if (jobDescription) form.append("jobDescription", jobDescription);
        if (targetRole) form.append("targetRole", targetRole);
        res = await fetch("/api/ats/scan", { method: "POST", body: form });
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = json.error?.message ?? "The ATS check failed";
        if (json.error?.code === "COMPILE_ERROR" && isProject) {
          toast.error(message, { action: { label: "Open editor", onClick: () => router.push(`/project/${projectId}`) } });
        } else {
          toast.error(message);
        }
        setStep(null);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      router.push(`/ats/${json.data.id}`);
    } catch {
      toast.error("The ATS check failed. Please try again.");
      setStep(null);
    } finally {
      timers.forEach(clearTimeout);
    }
  }, [tab, projectId, file, jobDescription, targetRole, router, queryClient]);

  const aiLeft = usage ? Math.max(0, usage.limits.atsAiReviewsPerMonth - usage.usage.atsAiReviews) : null;
  const busy = step !== null;

  return (
    <Page>
      <PageHeader
        title="ATS check"
        description="See your resume the way applicant tracking systems and AI screeners do: what they can read, how you score, and exactly what to fix."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-6 rounded-2xl border bg-card p-5 md:p-6" aria-label="Run an ATS check">
          <div>
            <h2 className="mb-3 font-heading text-base font-semibold">1. Choose a resume</h2>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="resume">One of my resumes</TabsTrigger>
                <TabsTrigger value="upload">Upload a file</TabsTrigger>
              </TabsList>
              <TabsContent value="resume">
                {projects === null ? (
                  <Skeleton className="h-10 w-full rounded-lg" />
                ) : projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No resumes yet.{" "}
                    <Link href="/templates" className="text-foreground underline underline-offset-4">
                      Start from a template
                    </Link>{" "}
                    or upload a file.
                  </p>
                ) : (
                  <>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      aria-label="Resume"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                    >
                      <option value="">Choose a resume…</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-muted-foreground">We compile it to PDF and check that file, exactly what an employer receives.</p>
                  </>
                )}
              </TabsContent>
              <TabsContent value="upload">
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
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) setFile(dropped);
                  }}
                  className={cn(
                    "flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors hover:border-ring/60",
                    dragging && "border-ring bg-accent/40"
                  )}
                >
                  <FileUp className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{file ? file.name : "Drop your resume here, or click to choose"}</span>
                  <span className="text-xs text-muted-foreground">PDF, DOCX or TXT · up to 5 MB</span>
                </button>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-semibold">
              2. Target a job <span className="text-xs font-normal text-muted-foreground">(recommended)</span>
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Paste the job description to get a job match score and the keywords you&apos;re missing.
            </p>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              maxLength={10_000}
              placeholder="Paste the job description…"
              className="h-36 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
            {!jobDescription.trim() && (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  maxLength={120}
                  placeholder="…or just a target role, e.g. Backend Engineer"
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </label>
            )}
          </div>

          <div>
            <Button className="w-full" onClick={run} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              {busy ? STEPS[tab === "resume" ? "project" : "upload"][step ?? 0] : "Run ATS check"}
            </Button>
            {aiLeft !== null && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                {aiLeft > 0 ? (
                  <>
                    AI review included · {aiLeft} of {usage!.limits.atsAiReviewsPerMonth} left this month
                  </>
                ) : (
                  <>
                    AI reviews used up this month; you&apos;ll get the rule-based check.{" "}
                    <Link href="/billing" className="text-foreground underline underline-offset-4">
                      Upgrade
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
        </section>

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
                      <p className="truncate text-sm font-medium">{r.fileName?.replace(/\.pdf$/i, "") ?? "Resume"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-3 text-right">
                      {r.hasJob && r.qualityScore > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Match <span className={cn("font-medium tabular-nums", scoreTone(r.qualityScore))}>{r.qualityScore}%</span>
                        </span>
                      )}
                      <span className={cn("font-display text-xl tabular-nums", scoreTone(r.score))}>{r.score}</span>
                    </div>
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
