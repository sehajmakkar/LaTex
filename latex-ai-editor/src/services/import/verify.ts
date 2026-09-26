import { resumeStrings, type ResumeData } from "@/services/import/resume-data";

/**
 * Checks an AI-structured resume against the text extracted from the original
 * file, in both directions:
 *  - every string in the result must come from the file ("unverified" if not);
 *  - every line of the file should appear in the result ("missed" if not).
 * Matching ignores case, spacing, punctuation and line-break hyphenation, and
 * falls back to word overlap for text a two-column PDF extracted out of order.
 */

const WORD = /[\p{L}\p{N}]+/gu;

/** Letters and digits only: "De-\nveloped a REST API" → "developedarestapi". */
export function squash(text: string): string {
  return (text.normalize("NFKC").toLowerCase().match(WORD) ?? []).join("");
}

function words(text: string): string[] {
  return text.normalize("NFKC").toLowerCase().match(WORD) ?? [];
}

const numbersOf = (text: string) => new Set(text.match(/\d+(?:[.,]\d+)*/g)?.map((n) => n.replace(/,/g, "")) ?? []);

export type VerifyResult = {
  /** Strings in the result that aren't in the original file. */
  unverified: { where: string; text: string }[];
  /** Lines of the original that aren't in the result. */
  missed: string[];
  /** Share of the original's lines (by characters) that made it into the result, 0–1. */
  coverage: number;
};

/** PDFs often extract the LaTeX logo as "LT X" or "LATEX". */
const normalizeSource = (text: string) => text.replace(/\bL\s?A?\s?T\s?E?\s?X\b/g, "LaTeX");

/**
 * Share of a text's words that occur in `haystack` as part of a run of 2+
 * consecutive words (or as one long, distinctive word). Robust to missing
 * spaces and to lines interleaved by columns or reordered list items, but an
 * invented sentence scores low because its word runs don't occur anywhere.
 */
function runCoverage(text: string, haystack: string): number {
  const w = words(text);
  if (!w.length) return 1;
  let covered = 0;
  let i = 0;
  while (i < w.length) {
    let j = i;
    while (j < w.length && haystack.includes(w.slice(i, j + 1).join(""))) j++;
    const run = j - i;
    if (run >= 2 || (run === 1 && w[i].length >= 6)) covered += run;
    i = Math.max(j, i + 1);
  }
  return covered / w.length;
}

/** Share of a line's words (3+ characters, so icon-font junk like "z" or "ï" is ignored) found in `haystack`, which may lack spaces. */
function containedWords(text: string, haystack: string): number {
  const w = words(text).filter((x) => x.length >= 3);
  if (!w.length) return 1;
  return w.filter((x) => haystack.includes(x)).length / w.length;
}

export function verifyResume(data: ResumeData, rawSource: string): VerifyResult {
  const source = normalizeSource(rawSource);
  const sourceSquashed = squash(source);
  const sourceNumbers = numbersOf(source);
  const sourceWords = new Set(words(source));

  const unverified: VerifyResult["unverified"] = [];
  const strings = resumeStrings(data);
  for (const s of strings) {
    const sq = squash(s.text);
    if (!sq || sourceSquashed.includes(sq)) continue;
    const newNumber = [...numbersOf(s.text)].some((n) => !sourceNumbers.has(n));
    // Short strings (table cells merged into one line, dates, places): every word must exist in the file.
    const w = words(s.text);
    const shortAndKnown = w.length <= 4 && w.every((x) => sourceWords.has(x));
    // 0.85 leaves room for a word hyphenated across lines with another column in between.
    if (!newNumber && (shortAndKnown || runCoverage(s.text, sourceSquashed) >= 0.85)) continue;
    unverified.push(s);
  }

  const outputSquashed = strings.map((s) => squash(s.text)).join("|");
  const outputJoined = outputSquashed.replace(/\|/g, "");
  // Our PDF extractor joins side-by-side blocks with 3+ spaces; treat them as separate lines.
  const lines = source
    .split(/\n| {3,}|\t+/)
    .map((l) => l.trim().replace(/^[•▪◦●■‣∙·*–-]+\s*/u, ""))
    .filter((l) => squash(l).length >= 4 && !/^(page \d+( of \d+)?|\d+)$/i.test(l));
  const missed: string[] = [];
  let total = 0;
  let covered = 0;
  for (const line of lines) {
    const sq = squash(line);
    total += sq.length;
    // A source line is often split across fields (title, company, date), so check its words, but all of them.
    const found = outputJoined.includes(sq) || containedWords(line, outputJoined) === 1;
    if (found) covered += sq.length;
    else missed.push(line);
  }
  return { unverified, missed: [...new Set(missed)], coverage: total ? covered / total : 1 };
}
