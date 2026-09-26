import type { AtsReportV2, Category, CategoryGroup, JobMatch, LayoutSignals } from "@/services/ats/types";
import { parseResume } from "@/services/ats/parse";
import { consistencyFindings, runRuleChecks } from "@/services/ats/checks";
import { matchJob, reviewContent, type ContentReview } from "@/services/ats/ai";
import { buildAiJobMatch, buildKeywordJobMatch } from "@/services/ats/match";

/** How much each group counts toward the overall score. */
const GROUP_WEIGHTS: Record<CategoryGroup, number> = { parsing: 0.4, impact: 0.35, style: 0.25 };

const ISSUE_LABELS: Record<string, string> = {
  no_metric: "No measurable result",
  weak_verb: "Weak opening verb",
  vague: "Vague",
  too_long: "Too long",
  passive: "Passive voice",
  jargon: "Jargon",
  unclear_impact: "Impact unclear",
  grammar: "Grammar",
};

function bulletStrengthCategory(review: ContentReview | null, aiReview: AtsReportV2["aiReview"]): Category {
  const base = {
    id: "bullet_strength",
    group: "impact" as const,
    title: "Bullet strength",
    description: "How an AI screener or recruiter reads your achievements: clear, specific, results-first.",
    tip: "Each bullet should say what you did, how, and what changed because of it.",
  };
  if (!review) {
    return {
      ...base,
      score: null,
      findings: [
        {
          status: "warn",
          title: aiReview === "skipped_quota" ? "AI review not included in this scan" : "AI review unavailable",
          detail:
            aiReview === "skipped_quota"
              ? "You've used this month's AI reviews. Upgrade to Pro for rewrites and editor prompts on every bullet."
              : "The AI part of the check didn't run this time. Re-scan to try again.",
        },
      ],
    };
  }
  const weak = review.bullets.length;
  return {
    ...base,
    score: review.bulletScore,
    findings:
      weak === 0
        ? [{ status: "pass", title: "Your bullets read clearly and show impact" }]
        : [{ status: review.bulletScore >= 7 ? "warn" : "fail", title: `${weak} bullet${weak > 1 ? "s" : ""} could be stronger` }],
    bulletFixes: review.bullets.map((b) => ({
      original: b.original,
      issues: b.issues.map((i) => ISSUE_LABELS[i] ?? i),
      rewrite: b.rewrite,
      prompt: b.prompt,
    })),
  };
}

function spellingCategory(review: ContentReview | null, parsed: ReturnType<typeof parseResume>): Category {
  const consistency = consistencyFindings(parsed);
  const findings = [...consistency.findings];
  if (review) {
    findings.unshift(
      review.spelling.length
        ? { status: "fail", title: `${review.spelling.length} spelling or grammar issue${review.spelling.length > 1 ? "s" : ""}` }
        : { status: "pass", title: "No spelling or grammar mistakes found" }
    );
  } else {
    findings.unshift({ status: "warn", title: "Spelling not checked", detail: "The spelling check is part of the AI review." });
  }
  const spellingScore = review ? review.spellingScore : 10;
  return {
    id: "spelling",
    group: "style",
    title: "Spelling & consistency",
    description: "Typos and inconsistent formatting are the fastest way to lose a recruiter's trust.",
    score: Math.max(0, spellingScore - consistency.penalty),
    findings,
    items: review?.spelling.map((s) => ({ label: s.text, note: `→ ${s.suggestion}` })),
  };
}

export async function buildAtsReport(input: {
  text: string;
  layout: LayoutSignals;
  jobDescription?: string;
  targetRole?: string;
  useAi: boolean;
}): Promise<AtsReportV2> {
  const { text, layout } = input;
  const parsed = parseResume(text, layout.pages);
  const categories = runRuleChecks(parsed, layout, text);
  const wantsMatch = !!(input.jobDescription?.trim() || input.targetRole?.trim());

  let review: ContentReview | null = null;
  let jobMatch: JobMatch | null = null;
  let aiReview: AtsReportV2["aiReview"] = input.useAi ? "complete" : "skipped_quota";

  if (input.useAi) {
    const [reviewResult, matchResult] = await Promise.allSettled([
      reviewContent(text, parsed.bullets),
      wantsMatch ? matchJob(text, { jobDescription: input.jobDescription, targetRole: input.targetRole }) : Promise.resolve(null),
    ]);
    if (reviewResult.status === "fulfilled") review = reviewResult.value;
    else {
      aiReview = "failed";
      console.error("ATS content review failed:", reviewResult.reason);
    }
    if (matchResult.status === "fulfilled" && matchResult.value) {
      jobMatch = buildAiJobMatch(matchResult.value, text, parsed, input.jobDescription?.trim() ? "job_description" : "target_role");
    } else if (matchResult.status === "rejected") {
      console.error("ATS job match failed:", matchResult.reason);
    }
  }
  if (!jobMatch && input.jobDescription?.trim()) {
    jobMatch = buildKeywordJobMatch(input.jobDescription, text, parsed);
  }

  categories.push(bulletStrengthCategory(review, aiReview), spellingCategory(review, parsed));

  const groupScores = Object.fromEntries(
    (Object.keys(GROUP_WEIGHTS) as CategoryGroup[]).map((group) => {
      const scores = categories.filter((c) => c.group === group && c.score !== null).map((c) => c.score as number);
      return [group, scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) : 0];
    })
  ) as Record<CategoryGroup, number>;
  const overall = Math.round(
    (Object.keys(GROUP_WEIGHTS) as CategoryGroup[]).reduce((sum, g) => sum + groupScores[g] * GROUP_WEIGHTS[g], 0)
  );

  return {
    version: 2,
    overall,
    groupScores,
    aiReview,
    summary: review?.summary ?? null,
    strengths: review?.strengths ?? [],
    categories,
    jobMatch,
    parsed,
    layout,
  };
}
