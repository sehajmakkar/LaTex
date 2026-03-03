import { runRuleBasedAtsAnalysis, RuleBasedResult } from "@/services/ats/rule-based-ats";
import { llmAtsService, LLMResult } from "@/services/ats/llm-ats-service";

export type ATSSection = {
  name: string;
  score: number;
  status: "good" | "warning" | "critical";
  findings: string[];
  tier: "free" | "pro";
};

export type KeywordAnalysis = {
  score: number;
  found: string[];
  missing: string[];
  tier: "pro";
};

export type ATSSuggestion = {
  text: string;
  priority: "high" | "medium" | "low";
  tier: "free" | "pro";
};

export type ATSReport = {
  parseScore: number;
  qualityScore: number;
  combinedScore: number;
  summary: string;
  sections: ATSSection[];
  keywords?: KeywordAnalysis;
  suggestions: ATSSuggestion[];
};

export async function analyzeAtsFromText(
  plainText: string,
  jobDescription?: string
): Promise<ATSReport> {
  const ruleBased: RuleBasedResult = runRuleBasedAtsAnalysis(plainText, jobDescription);
  const llm: LLMResult = await llmAtsService.analyze(plainText, jobDescription);

  const parseScore = ruleBased.parseScore;
  const qualityScore = llm.qualityScore;
  const combinedScore = Math.round(parseScore * 0.6 + qualityScore * 0.4);

  const sections: ATSSection[] = [];

  for (const sec of ruleBased.sections) {
    const important = ["experience", "education", "skills"];
    const baseScore = sec.present ? 80 : 40;
    const wordScore = Math.min(20, Math.round(sec.wordCount / 50) * 5);
    const score = Math.max(0, Math.min(100, baseScore + wordScore));

    let status: "good" | "warning" | "critical" = "good";
    if (score < 50) status = "critical";
    else if (score < 70) status = "warning";

    const findings: string[] = [];
    if (!sec.present) {
      findings.push(`Section "${sec.name}" is missing.`);
    } else if (sec.wordCount < 30 && important.includes(sec.name)) {
      findings.push(`Section "${sec.name}" is quite short. Consider adding more detail.`);
    }

    const tier: "free" | "pro" =
      sec.name === "experience" || sec.name === "education" || sec.name === "skills"
        ? "free"
        : "pro";

    sections.push({
      name: sec.name,
      score,
      status,
      findings,
      tier,
    });
  }

  // Contact section (always free)
  const contactFindings = [...ruleBased.contactFindings];
  const contactScore =
    (ruleBased.contact.name ? 25 : 0) +
    (ruleBased.contact.email ? 25 : 0) +
    (ruleBased.contact.phone ? 25 : 0) +
    (ruleBased.contact.linkedin ? 15 : 0) +
    (ruleBased.contact.github ? 10 : 0);
  sections.unshift({
    name: "contact",
    score: Math.max(0, Math.min(100, contactScore)),
    status: contactScore >= 70 ? "good" : contactScore >= 50 ? "warning" : "critical",
    findings: contactFindings,
    tier: "free",
  });

  // Formatting section (free)
  if (ruleBased.formatFindings.length > 0) {
    sections.push({
      name: "formatting",
      score: 70,
      status: "warning",
      findings: ruleBased.formatFindings,
      tier: "free",
    });
  }

  let keywords: KeywordAnalysis | undefined;
  if (ruleBased.keywordMatch) {
    keywords = {
      score: ruleBased.keywordMatch.score,
      found: ruleBased.keywordMatch.found,
      missing: ruleBased.keywordMatch.missing,
      tier: "pro",
    };
  }

  const mergedSuggestions: ATSSuggestion[] = [];

  for (const f of ruleBased.contactFindings) {
    mergedSuggestions.push({
      text: f,
      priority: "high",
      tier: "free",
    });
  }
  for (const f of ruleBased.formatFindings) {
    mergedSuggestions.push({
      text: f,
      priority: "medium",
      tier: "free",
    });
  }

  for (const s of llm.suggestions) {
    mergedSuggestions.push({
      text: s.text,
      priority: s.priority,
      tier: "pro",
    });
  }

  // Ensure at least first 3 suggestions are free
  for (let i = 0; i < mergedSuggestions.length && i < 3; i++) {
    mergedSuggestions[i].tier = "free";
  }

  return {
    parseScore,
    qualityScore,
    combinedScore,
    summary: llm.summary,
    sections,
    keywords,
    suggestions: mergedSuggestions,
  };
}

