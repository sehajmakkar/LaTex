"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { toast } from "sonner";

type ProjectSummary = {
  id: string;
  name: string;
};

type ReportSummary = {
  id: string;
  score: number;
  parseScore: number;
  qualityScore: number;
  createdAt: string;
  source: string;
  projectId: string | null;
};

export default function AtsIndexPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | "">("");
  const [jobDescription, setJobDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projectsRes, reportsRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/ats/reports"),
        ]);

        if (projectsRes.status === 401 || reportsRes.status === 401) {
          router.push("/sign-in");
          return;
        }

        if (projectsRes.ok) {
          const json = await projectsRes.json();
          const list = (json.data as any[]) ?? [];
          setProjects(
            list.map((p) => ({
              id: p.id as string,
              name: p.name as string,
            }))
          );
        }

        if (reportsRes.ok) {
          const json = await reportsRes.json();
          setReports((json.data as ReportSummary[]) ?? []);
        }
      } catch {
        if (!cancelled) {
          setProjects([]);
          setReports([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleAnalyzeProject = useCallback(async () => {
    if (!selectedProjectId) {
      toast.error("Select a project to analyze.");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "editor",
          projectId: selectedProjectId,
          jobDescription: jobDescription || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed to run ATS analysis");
        return;
      }
      const id = json.data?.id as string | undefined;
      if (id) {
        router.push(`/ats/${id}`);
      }
    } catch {
      toast.error("Failed to run ATS analysis");
    } finally {
      setAnalyzing(false);
    }
  }, [selectedProjectId, jobDescription, router]);

  const handleUploadAnalyze = useCallback(async () => {
    if (!uploadFile) {
      toast.error("Choose a resume file to upload.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const uploadRes = await fetch("/api/ats/upload", {
        method: "POST",
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        toast.error(uploadJson.error?.message ?? "Failed to upload resume");
        return;
      }
      const text: string | undefined = uploadJson.data?.text;
      if (!text) {
        toast.error("No text extracted from resume.");
        return;
      }

      const analyzeRes = await fetch("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "upload",
          text,
          jobDescription: jobDescription || undefined,
        }),
      });
      const analyzeJson = await analyzeRes.json();
      if (!analyzeRes.ok) {
        toast.error(analyzeJson.error?.message ?? "Failed to run ATS analysis");
        return;
      }
      const id = analyzeJson.data?.id as string | undefined;
      if (id) {
        router.push(`/ats/${id}`);
      }
    } catch {
      toast.error("Failed to analyze uploaded resume");
    } finally {
      setUploading(false);
    }
  }, [uploadFile, jobDescription, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <DashboardNav />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardNav
        rightContent={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/templates">Templates</Link>
            </Button>
          </>
        }
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h1 className="font-display text-xl font-semibold">ATS scoring</h1>
              <p className="text-sm text-muted-foreground">
                Run ATS analysis on a TeXel project or upload a resume file, then review the full
                report.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>Scan from a TeXel project</CardTitle>
                <CardDescription>
                  Choose one of your existing projects to run ATS analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="">Select a project…</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  className="mt-auto w-full"
                  size="sm"
                  onClick={handleAnalyzeProject}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    "Analyze selected project"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>Upload a resume file</CardTitle>
                <CardDescription>
                  Upload a PDF, DOCX, or TXT file for ATS analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Resume file
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    aria-hidden
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 w-full justify-start rounded-md border bg-background px-2 py-1.5 text-left text-sm font-normal"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadFile ? uploadFile.name : "Choose file…"}
                  </Button>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Max size 5MB. Supported: PDF, DOCX, TXT.
                  </p>
                </div>
                <Button
                  className="mt-auto w-full"
                  size="sm"
                  onClick={handleUploadAnalyze}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading & analyzing…
                    </>
                  ) : (
                    "Upload & analyze"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Job description (optional)</CardTitle>
              <CardDescription>
                Paste a job description below to see job match and keyword analysis. Used for both
                project scan and resume upload above.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste a job description to see job match and keywords…"
                className="h-24 w-full resize-none rounded-md border bg-background px-2 py-1.5 text-xs"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent ATS reports</CardTitle>
              <CardDescription>
                Open an existing report to see detailed sections, suggestions, and keywords.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have any ATS reports yet. Run an analysis above to get started.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {reports.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => router.push(`/ats/${r.id}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left hover:bg-accent/70"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {new Date(r.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Source: {r.source}
                          {r.projectId ? " · Linked to project" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Combined:{" "}
                          <span className="font-mono text-foreground">{r.score}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Parse {r.parseScore} · Quality {r.qualityScore}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

