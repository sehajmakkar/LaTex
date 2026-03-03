export type RuleBasedSectionSummary = {
  name: string;
  present: boolean;
  wordCount: number;
};

export type RuleBasedContact = {
  name: boolean;
  email: boolean;
  phone: boolean;
  linkedin: boolean;
  github: boolean;
};

export type RuleBasedKeywordMatch = {
  score: number;
  found: string[];
  missing: string[];
};

export type RuleBasedResult = {
  parseScore: number;
  sections: RuleBasedSectionSummary[];
  missingSections: string[];
  contact: RuleBasedContact;
  contactFindings: string[];
  keywordMatch?: RuleBasedKeywordMatch;
  formatFindings: string[];
};

const SECTION_LABELS = [
  "experience",
  "work experience",
  "employment",
  "education",
  "skills",
  "technical skills",
  "projects",
  "summary",
  "objective",
] as const;

function normalize(text: string): string {
  return text.toLowerCase();
}

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+/#. ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function runRuleBasedAtsAnalysis(
  plainText: string,
  jobDescription?: string
): RuleBasedResult {
  const text = plainText || "";
  const lower = normalize(text);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // --- Section detection ---
  const sectionsMap: Map<string, { wordCount: number }> = new Map();

  for (const label of SECTION_LABELS) {
    sectionsMap.set(label, { wordCount: 0 });
  }

  let currentSection: string | null = null;

  for (const line of lines) {
    const l = normalize(line);
    // treat line as heading if it matches a known section label
    const matchedLabel = SECTION_LABELS.find((label) => l === label);
    if (matchedLabel) {
      currentSection = matchedLabel;
      continue;
    }
    if (currentSection) {
      const section = sectionsMap.get(currentSection);
      if (section) {
        section.wordCount += tokenizeWords(line).length;
      }
    }
  }

  const sections: RuleBasedSectionSummary[] = [];
  const missingSections: string[] = [];

  for (const label of SECTION_LABELS) {
    const data = sectionsMap.get(label)!;
    const present = data.wordCount > 0;
    sections.push({
      name: label,
      present,
      wordCount: data.wordCount,
    });
    if (!present && ["experience", "education", "skills"].includes(label)) {
      missingSections.push(label);
    }
  }

  // --- Contact detection ---
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phoneRegex =
    /(\+?\d{1,3}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?[\d\s-]{6,}/;

  const hasEmail = emailRegex.test(text);
  const hasPhone = phoneRegex.test(text);

  // Name heuristic: first non-empty line that is not an email or phone and not a heading
  let hasName = false;
  if (lines.length > 0) {
    const first = lines[0];
    if (!emailRegex.test(first) && !phoneRegex.test(first)) {
      hasName = first.split(" ").length >= 2;
    }
  }

  const hasLinkedIn = lower.includes("linkedin.com");
  const hasGithub = lower.includes("github.com");

  const contact: RuleBasedContact = {
    name: hasName,
    email: hasEmail,
    phone: hasPhone,
    linkedin: hasLinkedIn,
    github: hasGithub,
  };

  const contactFindings: string[] = [];
  if (!hasName) contactFindings.push("Missing full name at the top of the resume.");
  if (!hasEmail) contactFindings.push("Missing email address.");
  if (!hasPhone) contactFindings.push("Missing phone number.");
  if (!hasLinkedIn) contactFindings.push("Consider adding a LinkedIn URL.");
  if (!hasGithub) contactFindings.push("Consider adding a GitHub or portfolio URL (for developers).");

  // --- Keyword / JD matching ---
  let keywordMatch: RuleBasedKeywordMatch | undefined;
  if (jobDescription && jobDescription.trim().length > 0) {
    const jdTokens = unique(tokenizeWords(jobDescription));
    const resumeTokens = new Set(tokenizeWords(text));

    const found: string[] = [];
    const missing: string[] = [];

    for (const token of jdTokens) {
      if (token.length < 3) continue; // skip very short tokens
      if (resumeTokens.has(token)) {
        found.push(token);
      } else {
        missing.push(token);
      }
    }

    const total = found.length + missing.length;
    const score = total > 0 ? Math.round((found.length / total) * 100) : 0;

    keywordMatch = {
      score,
      found,
      missing,
    };
  }

  // --- Formatting / structure checks ---
  const totalWords = tokenizeWords(text).length;
  const bulletLines = lines.filter((l) => /^[-*•\d]/.test(l)).length;
  const hasBullets = bulletLines > 0;

  const dateRegex =
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b[\s,]*\d{4}|\b\d{4}\b/gi;
  const dateMatches = text.match(dateRegex) || [];
  const hasDates = dateMatches.length > 0;

  const formatFindings: string[] = [];
  if (totalWords < 200) {
    formatFindings.push("Resume is quite short. Consider adding more detail to experience and projects.");
  } else if (totalWords > 900) {
    formatFindings.push("Resume is long. Consider focusing on the most relevant 1–2 pages.");
  }
  if (!hasBullets) {
    formatFindings.push("Use bullet points for experience to improve scanability.");
  }
  if (!hasDates) {
    formatFindings.push("No dates detected. ATS often expect dates for experience and education.");
  }

  // --- Parse score (0–100) ---
  let score = 0;

  // Contact: up to 30 points
  let contactScore = 0;
  if (hasName) contactScore += 10;
  if (hasEmail) contactScore += 10;
  if (hasPhone) contactScore += 10;

  // Sections: up to 30 points (experience, education, skills)
  let sectionScore = 0;
  const importantSections = ["experience", "education", "skills"];
  for (const sec of sections) {
    if (importantSections.includes(sec.name) && sec.present) {
      sectionScore += 10;
    }
  }

  // Keywords: up to 25 points
  let keywordScore = 0;
  if (keywordMatch) {
    keywordScore = Math.round((keywordMatch.score / 100) * 25);
  }

  // Format: up to 15 points
  let formatScore = 15;
  if (totalWords < 200 || totalWords > 900) {
    formatScore -= 5;
  }
  if (!hasBullets) {
    formatScore -= 5;
  }
  if (!hasDates) {
    formatScore -= 5;
  }
  if (formatScore < 0) formatScore = 0;

  score = contactScore + sectionScore + keywordScore + formatScore;
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return {
    parseScore: score,
    sections,
    missingSections,
    contact,
    contactFindings,
    keywordMatch,
    formatFindings,
  };
}

