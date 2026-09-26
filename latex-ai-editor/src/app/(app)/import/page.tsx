"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileCode2,
  FileText,
  FileUp,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Page, PageHeader } from "@/components/shell/Page";
import { DocxPreview } from "@/components/ats/DocxPreview";
import { useUsage } from "@/hooks/use-usage";
import type { ImportReport } from "@/services/import/types";
import { cn } from "@/lib/utils";

type Result = { projectId: string; name: string; report: ImportReport; pdfUrl: string | null };
type Stage = "pick" | "working" | "review";

const ACCEPT = ".pdf,.docx,.tex,.zip,.txt,.md";
const isLatex = (name: string) => /\.(tex|zip)$/i.test(name);

const STEPS = {
  latex: ["Reading your LaTeX project", "Inlining files and class/style files", "Compiling it"],
  ai: ["Reading your resume", "Structuring sections, entries and bullets", "Checking every line against your file", "Building the LaTeX and compiling"],
};

function Steps({ steps }: { steps: string[] }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActive((a) => Math.min(a + 1, steps.length - 1)), 3500);
    return () => clearInterval(timer);
  }, [steps.length]);
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={step} className={cn("flex items-center gap-3 text-sm", i > active && "text-muted-foreground")}>
          {i < active ? (
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : i === active ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="h-4 w-4 rounded-full border" />
          )}
          {step}
        </li>
      ))}
    </ol>
  );
}

function Original({ file, text }: { file: File | null; text: string }) {
  const url = useMemo(() => (file && /\.(pdf|docx)$/i.test(file.name) ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  const [fileText, setFileText] = useState<string>("");
  useEffect(() => {
    if (file && /\.(tex|txt|md)$/i.test(file.name)) file.text().then(setFileText).catch(() => {});
  }, [file]);

  if (file && /\.pdf$/i.test(file.name) && url) return <iframe src={url} title="Your original resume" className="h-full w-full border-0" />;
  if (file && /\.docx$/i.test(file.name) && url) return <DocxPreview fileUrl={url} className="h-full" />;
  const shown = text || fileText;
  if (shown) return <pre className="h-full overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs">{shown}</pre>;
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {file ? `${file.name}: a LaTeX project, shown on the right as it compiles in Vero.` : "No preview"}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label="Copy line"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Collapsible({ title, count, tone, children }: { title: string; count: number; tone: "warn" | "info"; children: React.ReactNode }) {
  const [open, setOpen] = useState(count <= 5);
  return (
    <div className="rounded-xl border bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">
        <AlertTriangle className={cn("h-4 w-4 shrink-0", tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
        <span className="flex-1">
          {title} <span className="text-muted-foreground">({count})</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t px-4 py-3">{children}</div>}
    </div>
  );
}

function Report({ report }: { report: ImportReport }) {
  const pct = report.coverage === null ? null : Math.round(report.coverage * 100);
  return (
    <div className="space-y-3">
      {report.method === "ai" ? (
        <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
          {pct !== null && pct >= 97 && report.unverified.length === 0 ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div className="text-sm">
            {pct === null ? (
              <p>We couldn&apos;t check this file line by line (it has no text layer). Compare the two versions carefully.</p>
            ) : (
              <p>
                <span className="font-medium">{pct}% of your file&apos;s text</span> is in the new resume
                {report.unverified.length === 0 ? ", and every line in it was found in your file." : "."}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Rebuilt in the Jake&apos;s Resume layout. Change the design later with the AI command bar or by editing the LaTeX.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
          {report.compiles ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div className="text-sm">
            <p>
              Imported <span className="font-mono text-xs">{report.mainFile}</span> as-is
              {report.embedded?.length ? ` with ${report.embedded.join(", ")}` : ""}.
              {report.compiles ? ` It compiles${report.engine ? ` with ${report.engine}` : ""}.` : " It doesn't compile here yet."}
            </p>
            {!report.compiles && report.compileError && (
              <p className="mt-1 break-words font-mono text-xs text-muted-foreground">{report.compileError}</p>
            )}
            {!report.compiles && (
              <p className="mt-1 text-xs text-muted-foreground">Open it in the editor, press Compile, then use “Fix compile error” in the AI command bar.</p>
            )}
          </div>
        </div>
      )}

      {report.unverified.length > 0 && (
        <Collapsible title="Check these: not found word-for-word in your file" count={report.unverified.length} tone="warn">
          <ul className="space-y-1.5 text-sm">
            {report.unverified.map((u, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">{u.where}</span>
                <span className="min-w-0 break-words">{u.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">They&apos;re also listed at the top of the LaTeX so you can fix or delete them.</p>
        </Collapsible>
      )}
      {report.missed.length > 0 && (
        <Collapsible title="Lines from your file that aren't in the new resume" count={report.missed.length} tone="warn">
          <ul className="space-y-1 text-sm">
            {report.missed.map((m, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="min-w-0 flex-1 break-words">{m}</span>
                <CopyButton text={m} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Often these are page numbers or repeated headers. Copy any that matter and paste them in the editor.</p>
        </Collapsible>
      )}
      {report.warnings.map((w) => (
        <p key={w} className="flex gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {w}
        </p>
      ))}
    </div>
  );
}

export default function ImportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: usage } = useUsage();
  const [stage, setStage] = useState<Stage>("pick");
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const method: "latex" | "ai" = tab === "file" && file && isLatex(file.name) ? "latex" : "ai";
  const aiLeft = usage ? Math.max(0, usage.limits.aiImportsPerMonth - usage.usage.aiImports) : null;
  const atProjectLimit = usage ? usage.plan === "free" && usage.usage.projects >= usage.limits.projects : false;
  const ready = tab === "file" ? !!file : text.trim().length >= 50;

  const start = async () => {
    if (!ready) return;
    const form = new FormData();
    if (tab === "file" && file) form.append("file", file);
    else form.append("text", text);
    setStage("working");
    try {
      const res = await fetch("/api/import", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const message = body?.error?.message ?? `Import failed (${res.status}).`;
        toast.error("Import failed", {
          description: message,
          action: /upgrade/i.test(message) ? { label: "Upgrade", onClick: () => router.push("/billing") } : undefined,
        });
        setStage("pick");
        return;
      }
      setResult(body.data);
      setStage("review");
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    } catch {
      toast.error("Import failed", { description: "Check your connection and try again." });
      setStage("pick");
    }
  };

  const reset = () => {
    setResult(null);
    setFile(null);
    setText("");
    setStage("pick");
  };

  if (stage === "review" && result) {
    return (
      <div className="flex flex-col md:h-dvh">
        <header className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Imported</p>
            <h1 className="truncate font-display text-xl tracking-tight">{result.name}</h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Import another
            </Button>
            <Button asChild>
              <Link href={`/project/${result.projectId}`}>
                Open in editor <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)_minmax(0,1fr)]">
          <aside className="overflow-y-auto border-b p-4 lg:border-b-0 lg:border-r">
            <Report report={result.report} />
          </aside>
          <section className="flex min-h-[70dvh] flex-col border-b lg:min-h-0 lg:border-b-0 lg:border-r" aria-label="Your original">
            <p className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">Your original</p>
            <div className="min-h-0 flex-1 bg-muted/40">
              <Original file={file} text={tab === "paste" ? text : ""} />
            </div>
          </section>
          <section className="flex min-h-[70dvh] flex-col lg:min-h-0" aria-label="In Vero">
            <p className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">In Vero</p>
            <div className="min-h-0 flex-1 bg-muted/40">
              {result.pdfUrl ? (
                <iframe src={result.pdfUrl} title="Imported resume PDF" className="h-full w-full border-0" />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  No PDF yet: open it in the editor to fix the compile error.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <Page className="max-w-3xl">
      <PageHeader
        title="Import your resume"
        description="Bring the resume you already have. LaTeX from Overleaf stays exactly as it is; PDFs and Word files are rebuilt in LaTeX, with every line checked against your file."
      />

      {stage === "working" ? (
        <div className="rounded-2xl border bg-card p-6">
          <p className="mb-4 font-medium">{method === "latex" ? "Importing your LaTeX project…" : "Rebuilding your resume in LaTeX…"}</p>
          <Steps steps={STEPS[method]} />
          <p className="mt-5 text-xs text-muted-foreground">{method === "ai" ? "This takes 10–30 seconds." : "This takes a few seconds."}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {atProjectLimit && (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
              The free plan includes {usage?.limits.projects} resumes and you have {usage?.usage.projects}. Delete one or{" "}
              <Link href="/billing" className="underline underline-offset-4">
                upgrade to Pro
              </Link>{" "}
              to import another.
            </p>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as "file" | "paste")}>
            <TabsList>
              <TabsTrigger value="file">Upload a file</TabsTrigger>
              <TabsTrigger value="paste">Paste text</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="mt-4">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
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
                  "flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center transition-colors hover:border-ring/60",
                  dragging && "border-ring bg-accent/40"
                )}
              >
                <FileUp className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">{file ? file.name : "Drop your resume here, or click to choose"}</span>
                <span className="text-xs text-muted-foreground">Overleaf .zip or .tex · PDF · Word (.docx) · TXT/Markdown · up to 5 MB</span>
              </button>
            </TabsContent>
            <TabsContent value="paste" className="mt-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={30_000}
                placeholder="Paste your resume text: from a Google Doc, LinkedIn profile, Markdown…"
                className="h-64 w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </TabsContent>
          </Tabs>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn("rounded-2xl border p-4", method === "latex" && ready && "border-foreground/40")}>
              <p className="flex items-center gap-2 text-sm font-medium">
                <FileCode2 className="h-4 w-4" /> From Overleaf or LaTeX
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                In Overleaf: <span className="font-medium text-foreground">Menu → Download → Source</span>, then upload the .zip. Your design stays
                exactly the same, including custom class files. Free and unlimited.
              </p>
            </div>
            <div className={cn("rounded-2xl border p-4", method === "ai" && ready && "border-foreground/40")}>
              <p className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" /> From PDF, Word or text
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                AI reads it and we rebuild it in the clean, ATS-friendly Jake&apos;s Resume layout. Your wording is kept exactly, and every line is
                checked against your file.{aiLeft !== null && ` ${aiLeft} of ${usage?.limits.aiImportsPerMonth} left this month.`}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="lg" onClick={start} disabled={!ready || atProjectLimit || (method === "ai" && aiLeft === 0)}>
              {method === "latex" ? "Import LaTeX" : "Import with AI"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Page>
  );
}
