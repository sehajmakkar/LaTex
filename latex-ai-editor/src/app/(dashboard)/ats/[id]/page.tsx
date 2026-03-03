"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { ScoreSlider } from "@/components/ats/ScoreSlider";
import { ReportSection } from "@/components/ats/ReportSection";
import { SuggestionList } from "@/components/ats/SuggestionList";
import { KeywordAnalysisView } from "@/components/ats/KeywordAnalysis";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type AtsReportResponse = {
  id: string;
  createdAt: string;
  source: string;
  projectId: string | null;
  score: number;
  parseScore: number;
  qualityScore: number;
  resumeText: string;
  jobDescription: string | null;
  report: {
    parseScore: number;
    qualityScore: number;
    combinedScore: number;
    summary: string;
    sections: {
      name: string;
      score: number;
      status: "good" | "warning" | "critical";
      findings: string[];
      tier: "free" | "pro";
    }[];
    keywords?: {
      score: number;
      found: string[];
      missing: string[];
      tier: "pro";
    };
    suggestions: {
      text: string;
      priority: "high" | "medium" | "low";
      tier: "free" | "pro";
    }[];
  };
};

type BillingMe = {
  plan: string;
  subscriptionStatus: string | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function AtsReportPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AtsReportResponse | null>(null);
  const [plan, setPlan] = useState<string>("free");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [reportRes, billingRes] = await Promise.all([
          fetch(`/api/ats/reports/${id}`),
          fetch("/api/billing/me"),
        ]);

        if (reportRes.status === 401 || billingRes.status === 401) {
          router.push("/sign-in");
          return;
        }

        if (reportRes.ok) {
          const json = await reportRes.json();
          if (!cancelled) setData(json.data as AtsReportResponse);
        } else if (!cancelled) {
          router.push("/ats");
        }

        if (billingRes.ok) {
          const json = await billingRes.json();
          const m = json.data as BillingMe;
          if (!cancelled) setPlan(m.plan ?? "free");
        }
      } catch {
        if (!cancelled) {
          router.push("/ats");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <DashboardNav />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  const { report } = data;

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

      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize={55} minSize={35}>
            <div className="flex h-full flex-col gap-4 overflow-auto p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    ATS report ·{" "}
                    {new Date(data.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <h1 className="font-display text-lg font-semibold">
                    ATS analysis
                    {data.source === "editor" ? " · TeXel project" : " · Uploaded resume"}
                  </h1>
                </div>
                <div className="flex gap-2">
                  {data.projectId ? (
                    <Button size="sm" asChild>
                      <Link href={`/project/${data.projectId}`}>Edit in TeXel editor</Link>
                    </Button>
                  ) : (
                    <Button size="sm" asChild variant="outline">
                      <Link href="/dashboard">Open dashboard</Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/billing">Upgrade plan</Link>
                  </Button>
                </div>
              </div>

              <ScoreSlider
                parseScore={report.parseScore}
                qualityScore={report.qualityScore}
                combinedScore={report.combinedScore}
              />

              <div className="space-y-2 rounded-2xl border bg-card p-4 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Summary</p>
                <p className="text-sm text-foreground">{report.summary}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {report.sections.map((section) => (
                  <ReportSection key={section.name} section={section} plan={plan} />
                ))}
              </div>

              <KeywordAnalysisView keywords={report.keywords} plan={plan} />

              <SuggestionList suggestions={report.suggestions} plan={plan} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={25}>
            <div className="flex h-full flex-col border-l border-border bg-muted/40">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Resume preview</p>
                  <p className="text-xs text-muted-foreground">
                    This is the plain-text view used for ATS parsing.
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="whitespace-pre-wrap break-words text-xs text-foreground">
                  {data.resumeText}
                </pre>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}

