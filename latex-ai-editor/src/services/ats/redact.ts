import type { AtsReportV2 } from "@/services/ats/types";

/** How much of each Pro-level detail a free user sees before the rest is locked. */
export const FREE_VISIBLE = {
  bulletFixes: 2,
  missingKeywords: 5,
  listItems: 3,
};

/**
 * Removes Pro-only details for free users. Runs on the server, so locked
 * content never reaches the browser; the page shows a blurred placeholder.
 * Scores, statuses and the parse view stay visible to everyone.
 */
export function redactForPlan(report: AtsReportV2, plan: "free" | "pro"): AtsReportV2 {
  if (plan === "pro") return report;
  let redacted = false;

  const categories = report.categories.map((category) => {
    const bulletFixes = category.bulletFixes?.map((fix, i) => {
      if (i < FREE_VISIBLE.bulletFixes) return fix;
      redacted = true;
      return { ...fix, rewrite: null, prompt: null, locked: true };
    });
    const items = category.items?.map((item, i) => {
      if (i < FREE_VISIBLE.listItems) return item;
      redacted = true;
      return { label: "Locked", locked: true };
    });
    return { ...category, bulletFixes, items };
  });

  let missingSeen = 0;
  const jobMatch = report.jobMatch && {
    ...report.jobMatch,
    requirements: report.jobMatch.requirements.map((r) => {
      if (r.status !== "missing") return r;
      missingSeen++;
      if (missingSeen <= FREE_VISIBLE.missingKeywords) return r;
      redacted = true;
      return { ...r, skill: "Locked keyword", evidence: null, locked: true };
    }),
  };

  return { ...report, categories, jobMatch, redacted };
}
