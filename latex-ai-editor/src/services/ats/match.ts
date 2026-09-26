import type { JobMatch, ParsedResume, Requirement } from "@/services/ats/types";
import type { AiMatch } from "@/services/ats/ai";
import { normalizeForMatch } from "@/services/ats/ai";
import { aliasesFor, dictionarySkillsIn, mentions } from "@/services/ats/skills";
import { yearsOfExperience } from "@/services/ats/parse";

/** How much each requirement counts toward the match (hard skills dominate, as in real ATS). */
const WEIGHTS: Record<Requirement["kind"], Record<Requirement["importance"], number>> = {
  hard: { required: 3, preferred: 1.5 },
  tool: { required: 3, preferred: 1.5 },
  certification: { required: 2, preferred: 1 },
  education: { required: 2, preferred: 1 },
  soft: { required: 1, preferred: 0.5 },
};
const SEMANTIC_CREDIT = 0.75;
const TITLE_STOPWORDS = new Set(["senior", "junior", "sr", "jr", "lead", "staff", "principal", "intern", "ii", "iii", "i", "the", "a", "of", "and", "for", "remote"]);

/** The resume line that contains a term, for showing as evidence. */
function lineWith(text: string, term: string): string | null {
  const line = text.split("\n").find((l) => mentions(l, term));
  return line ? line.trim().slice(0, 160) : null;
}

function titleMatches(title: string | null, text: string): boolean | null {
  if (!title) return null;
  const words = title.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 1 && !TITLE_STOPWORDS.has(w));
  if (words.length === 0) return null;
  return words.filter((w) => mentions(text, w)).length / words.length >= 0.6;
}

function scoreMatch(reqs: Requirement[], titleMatch: boolean | null, yearsRequired: number | null, yearsFound: number | null): number {
  const total = reqs.reduce((s, r) => s + WEIGHTS[r.kind][r.importance], 0);
  const earned = reqs.reduce((s, r) => s + WEIGHTS[r.kind][r.importance] * (r.status === "exact" ? 1 : r.status === "semantic" ? SEMANTIC_CREDIT : 0), 0);
  const keywordScore = total > 0 ? (earned / total) * 100 : 0;
  let score = titleMatch === null ? keywordScore : keywordScore * 0.85 + (titleMatch ? 15 : 0);
  if (yearsRequired && yearsFound !== null && yearsFound < yearsRequired) {
    score -= Math.min(10, (yearsRequired - yearsFound) * 4);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Verifies the AI's claims against the actual resume text before scoring. */
export function buildAiJobMatch(ai: AiMatch, text: string, parsed: ParsedResume, source: JobMatch["source"]): JobMatch {
  const textNorm = normalizeForMatch(text);
  const requirements: Requirement[] = ai.requirements.map((r) => {
    const names = aliasesFor(r.skill, r.aliases);
    const exact = names.find((n) => mentions(text, n));
    if (exact) return { skill: r.skill, kind: r.kind, importance: r.importance, status: "exact", evidence: lineWith(text, exact) };
    const evidence = r.evidence.trim();
    const verified = r.status !== "missing" && evidence.length >= 8 && textNorm.includes(normalizeForMatch(evidence));
    return {
      skill: r.skill,
      kind: r.kind,
      importance: r.importance,
      status: verified ? "semantic" : "missing",
      evidence: verified ? evidence.slice(0, 160) : null,
    };
  });
  const yearsRequired = ai.yearsRequired > 0 ? ai.yearsRequired : null;
  const yearsFound = yearsOfExperience(parsed.experience.map((e) => e.dates ?? "").filter(Boolean));
  const roleTitle = ai.roleTitle.trim() || null;
  const titleMatch = titleMatches(roleTitle, text);
  return {
    source,
    method: "ai",
    roleTitle,
    titleMatch,
    yearsRequired,
    yearsFound,
    score: scoreMatch(requirements, titleMatch, yearsRequired, yearsFound),
    requirements,
    summary: ai.summary.slice(0, 500),
  };
}

/** Keyword-only match used when the AI review doesn't run. */
export function buildKeywordJobMatch(jd: string, text: string, parsed: ParsedResume): JobMatch | null {
  const skills = dictionarySkillsIn(jd);
  if (skills.length === 0) return null;
  const requirements: Requirement[] = skills.map((s) => {
    const hit = aliasesFor(s.skill).find((n) => n.length > 1 && mentions(text, n));
    return { skill: s.skill, kind: s.kind, importance: s.importance, status: hit ? "exact" : "missing", evidence: hit ? lineWith(text, hit) : null };
  });
  const years = jd.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
  const yearsRequired = years ? Number(years[1]) : null;
  const yearsFound = yearsOfExperience(parsed.experience.map((e) => e.dates ?? "").filter(Boolean));
  return {
    source: "job_description",
    method: "keywords",
    roleTitle: null,
    titleMatch: null,
    yearsRequired,
    yearsFound,
    score: scoreMatch(requirements, null, yearsRequired, yearsFound),
    requirements,
    summary: null,
  };
}
