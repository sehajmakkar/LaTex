/**
 * ATS report v2. Stored as JSON in ats_reports.report; the API redacts
 * Pro-only details for free users before it leaves the server (see redact.ts).
 */

export type CheckStatus = "pass" | "warn" | "fail";

export type CategoryGroup = "parsing" | "impact" | "style";

export type Finding = {
  status: CheckStatus;
  title: string;
  detail?: string;
};

/** A bullet the AI flagged, with a rewrite and a prompt for the editor's ⌘K. */
export type BulletFix = {
  original: string;
  issues: string[];
  rewrite: string | null;
  prompt: string | null;
  locked?: boolean;
};

export type Category = {
  id: string;
  group: CategoryGroup;
  title: string;
  description: string;
  /** 0–10, or null when this category needs the AI review and it didn't run. */
  score: number | null;
  findings: Finding[];
  /** Short "how to fix" guidance shown under the findings. */
  tip?: string;
  bulletFixes?: BulletFix[];
  /** Extra list items (buzzwords found, spelling mistakes…). */
  items?: { label: string; note?: string; locked?: boolean }[];
};

export type KeywordStatus = "exact" | "semantic" | "missing";

export type Requirement = {
  skill: string;
  kind: "hard" | "tool" | "soft" | "certification" | "education";
  importance: "required" | "preferred";
  status: KeywordStatus;
  /** Where the resume shows it (verified to exist in the resume text). */
  evidence: string | null;
  locked?: boolean;
};

export type JobMatch = {
  source: "job_description" | "target_role";
  method: "ai" | "keywords";
  roleTitle: string | null;
  titleMatch: boolean | null;
  yearsRequired: number | null;
  yearsFound: number | null;
  /** 0–100. */
  score: number;
  requirements: Requirement[];
  summary: string | null;
};

export type ParsedResume = {
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    website: string | null;
    location: string | null;
  };
  sections: { name: string; standard: string | null; wordCount: number }[];
  experience: { title: string | null; company: string | null; dates: string | null; bullets: number }[];
  education: { line: string; dates: string | null }[];
  skills: string[];
  bullets: string[];
  wordCount: number;
  pages: number | null;
};

export type LayoutSignals = {
  fileType: "pdf" | "docx" | "txt";
  pages: number | null;
  hasTextLayer: boolean;
  multiColumn: boolean | null;
  tables: number | null;
  images: number | null;
  unreadableChars: number;
};

export type AtsReportV2 = {
  version: 2;
  /** 0–100 overall resume score (parsing + impact + style). */
  overall: number;
  groupScores: Record<CategoryGroup, number>;
  aiReview: "complete" | "skipped_quota" | "failed" | "not_requested";
  summary: string | null;
  strengths: string[];
  categories: Category[];
  jobMatch: JobMatch | null;
  parsed: ParsedResume;
  layout: LayoutSignals;
  /** True when some details were removed for the free plan. */
  redacted?: boolean;
};
