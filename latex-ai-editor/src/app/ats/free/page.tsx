"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FileCode2, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ScoreSlider } from "@/components/ats/ScoreSlider";
import { SuggestionList } from "@/components/ats/SuggestionList";

type FreeReport = {
  combinedScore: number;
  parseScore: number;
  qualityScore: number;
  summary: string;
  suggestions: {
    text: string;
    priority: "high" | "medium" | "low";
    tier: "free" | "pro";
  }[];
};

export default function FreeAtsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FreeReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Create a client-side PDF preview URL when a PDF is selected.
  useEffect(() => {
    if (!file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });
    // Cleanup handled when file changes or component unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleAnalyze = async () => {
    setError(null);
    if (!file) {
      setError("Choose a resume file to analyze.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/ats/upload", {
        method: "POST",
        body: formData,
      });
      // If /api/ats/upload is protected and we get 401, send user to sign-in.
      if (uploadRes.status === 401) {
        router.push("/sign-in?redirect_url=/ats/free");
        return;
      }
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadJson.error?.message ?? "Failed to upload resume.");
        return;
      }
      const text: string | undefined = uploadJson.data?.text;
      if (!text) {
        setError("We could not extract text from this resume file.");
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
      if (analyzeRes.status === 401) {
        router.push("/sign-in?redirect_url=/ats/free");
        return;
      }
      const analyzeJson = await analyzeRes.json();
      if (!analyzeRes.ok) {
        setError(analyzeJson.error?.message ?? "Failed to run ATS analysis.");
        return;
      }
      const full = analyzeJson.data?.report as any;
      if (!full) {
        setError("No report returned from ATS analysis.");
        return;
      }
      const teaser: FreeReport = {
        combinedScore: full.combinedScore ?? 0,
        parseScore: full.parseScore ?? 0,
        qualityScore: full.qualityScore ?? 0,
        summary: full.summary ?? "",
        suggestions: (full.suggestions as any[])?.slice(0, 3) ?? [],
      };
      setReport(teaser);
    } catch {
      setError("Something went wrong while analyzing your resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
            <FileCode2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display text-base font-semibold">TeXel</p>
            <p className="text-[11px] text-muted-foreground">Free ATS score check</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/templates">Templates</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl space-y-8">
          <section className="space-y-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Free ATS resume check
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              See how your resume scores in an ATS scan
            </h1>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              Upload your resume and get an instant ATS score, summary, and a few key suggestions.
              Sign in to unlock the full report and edit your resume in TeXel&apos;s LaTeX editor.
            </p>
          </section>

          <section className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="space-y-4 rounded-2xl border bg-card p-5">
              <div className="space-y-2 text-left">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  1. Upload your resume
                </p>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  Supported formats: PDF, DOCX, TXT. Max size 5MB.
                </p>
              </div>
              <div className="space-y-2 text-left">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  2. (Optional) Paste a job description
                </p>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="h-28 w-full resize-none rounded-md border bg-background px-2 py-1.5 text-xs"
                  placeholder="Paste a job description to see job match and keyword hints…"
                />
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    "Get free ATS score"
                  )}
                </Button>
                {error && (
                  <p className="text-xs text-destructive sm:flex-1 sm:text-right">{error}</p>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                We don&apos;t store your resume on this page unless you sign in. For signed-in
                users, full reports are saved in your account.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-5">
              {report ? (
                <>
                  {previewUrl && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Resume preview (PDF)
                      </p>
                      <div className="h-48 w-full overflow-hidden rounded-md border bg-muted/40">
                        <iframe
                          src={previewUrl}
                          title="Uploaded resume preview"
                          className="h-full w-full border-0"
                        />
                      </div>
                    </div>
                  )}
                  <ScoreSlider
                    parseScore={report.parseScore}
                    qualityScore={report.qualityScore}
                    combinedScore={report.combinedScore}
                  />
                  <div className="space-y-2 rounded-xl border bg-background/60 p-3 text-left text-xs">
                    <p className="text-[11px] font-medium text-muted-foreground">Summary</p>
                    <p className="text-xs text-foreground">{report.summary}</p>
                  </div>
                  <SuggestionList
                    suggestions={report.suggestions}
                    plan="free"
                  />
                  <div className="flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    <span>
                      Full sections, detailed keyword match, and all suggestions are available after
                      you sign in and run a full ATS report.
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-sm text-muted-foreground">
                  <div className="relative h-16 w-16">
                    <Image
                      src="/logo/icons8-chatgpt-100.png"
                      alt="TeXel"
                      fill
                      className="rounded-2xl object-contain opacity-80"
                    />
                  </div>
                  <p>
                    Upload a resume on the left to see a preview of your ATS score, summary, and a
                    few suggestions here.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 text-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-left">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Go further with TeXel
                </p>
                <p className="mt-1 text-sm text-foreground">
                  See the full ATS report, unlock all suggestions, and edit your resume in a
                  powerful LaTeX editor.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" asChild>
                  <Link href="/sign-in">Sign in to see full report</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/billing">View Pro plans</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

