import type { ParsedResume } from "@/services/ats/types";

/** Canonical section → headings ATS parsers recognise for it. */
export const SECTION_SYNONYMS: Record<string, string[]> = {
  summary: ["summary", "professional summary", "profile", "professional profile", "about", "about me", "career summary", "overview", "personal statement"],
  objective: ["objective", "career objective", "professional objective"],
  experience: [
    "experience", "work experience", "professional experience", "employment", "employment history", "work history",
    "career history", "relevant experience", "internships", "internship experience", "experience and internships",
  ],
  education: ["education", "academic background", "academics", "education and training", "qualifications", "academic qualifications"],
  skills: [
    "skills", "technical skills", "core skills", "key skills", "core competencies", "competencies", "skills and tools",
    "technologies", "tech stack", "expertise", "skills and expertise", "technical expertise", "tools",
  ],
  projects: ["projects", "personal projects", "academic projects", "key projects", "selected projects", "project experience"],
  certifications: ["certifications", "certificates", "licenses", "licenses and certifications", "certifications and licenses"],
  achievements: ["achievements", "awards", "honors", "honours", "awards and honors", "accomplishments", "awards and achievements"],
  publications: ["publications", "research", "research experience", "papers"],
  leadership: ["leadership", "activities", "extracurricular", "extracurricular activities", "positions of responsibility", "leadership and activities"],
  volunteer: ["volunteer", "volunteering", "volunteer experience", "community involvement"],
  languages: ["languages", "language skills"],
  interests: ["interests", "hobbies", "hobbies and interests"],
  references: ["references", "referees"],
  coursework: ["coursework", "relevant coursework"],
};

const HEADING_LOOKUP = new Map<string, string>();
for (const [canonical, names] of Object.entries(SECTION_SYNONYMS)) {
  for (const name of names) HEADING_LOOKUP.set(name, canonical);
}

const normalizeHeading = (line: string) =>
  line.toLowerCase().replace(/&/g, "and").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:${MONTH}\\s*,?\\s*(?:19|20)\\d{2}|\\d{1,2}\\/(?:19|20)?\\d{2}|(?:19|20)\\d{2})`;
const END = `(?:${DATE}|present|current|now|ongoing|till date|to date)`;
export const DATE_RANGE = new RegExp(`${DATE}\\s*(?:–|—|-{1,2}|to|until)\\s*${END}`, "i");
const DATE_RANGE_G = new RegExp(DATE_RANGE.source, "gi");
const SINGLE_DATE = new RegExp(`(?:expected\\s+)?${MONTH}\\s*,?\\s*(?:19|20)\\d{2}`, "i");

const BULLET_CHARS = /^[•●▪◦‣·∙○■□➢➤►\-*–]\s*/;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const LINKEDIN = /linkedin\.com\/[A-Za-z0-9/_\-%.]+/i;
const WEBSITE = /\b(?:https?:\/\/)?(?:www\.)?(?:github\.com|gitlab\.com|behance\.net|dribbble\.com|[a-z0-9-]+\.(?:dev|io|me|com|app|ai|co|in|net|org))(?:\/[^\s|,]*)?/i;
const DEGREE = /\b(b\.?\s?tech|m\.?\s?tech|bachelor|master|b\.?s\.?c?|m\.?s\.?c?|b\.?a\.?|m\.?a\.?|mba|ph\.?d|doctorate|diploma|associate|b\.?e\.?|m\.?e\.?|high school|secondary|university|college|institute|school)\b/i;

/** Phone numbers: 10–15 digits, never a "2019 - 2021" style date range. */
export function findPhone(text: string): string | null {
  for (const match of text.matchAll(/\+?\(?\d[\d \t().-]{8,18}\d/g)) {
    const candidate = match[0].trim();
    const digits = candidate.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) continue;
    if (/^(19|20)\d{2}\D+(19|20)\d{2}$/.test(candidate)) continue;
    return candidate;
  }
  return null;
}

type DateParts = { start: number; end: number } | null;

function toMonthIndex(token: string, isEnd: boolean): number | null {
  const now = new Date();
  if (/present|current|now|ongoing|date/i.test(token)) return now.getFullYear() * 12 + now.getMonth();
  const year = token.match(/(19|20)\d{2}/)?.[0];
  if (!year) {
    const slash = token.match(/(\d{1,2})\/(\d{2})$/);
    return slash ? (2000 + Number(slash[2])) * 12 + Number(slash[1]) - 1 : null;
  }
  const monthName = token.match(new RegExp(MONTH, "i"))?.[0];
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const slashMonth = token.match(/^(\d{1,2})\//)?.[1];
  const month = monthName ? months.indexOf(monthName.slice(0, 3).toLowerCase()) : slashMonth ? Number(slashMonth) - 1 : isEnd ? 11 : 0;
  return Number(year) * 12 + Math.max(0, month);
}

export function parseRange(range: string): DateParts {
  const [startToken, endToken] = range.split(/\s*(?:–|—|-{1,2}|to|until)\s*/i);
  if (!startToken || !endToken) return null;
  const start = toMonthIndex(startToken, false);
  const end = toMonthIndex(endToken, true);
  return start != null && end != null && end >= start ? { start, end } : null;
}

/** Total years of experience from job date ranges, merging overlaps. */
export function yearsOfExperience(ranges: string[]): number | null {
  const spans = ranges.map(parseRange).filter((r): r is { start: number; end: number } => !!r).sort((a, b) => a.start - b.start);
  if (spans.length === 0) return null;
  let months = 0;
  let [curStart, curEnd] = [spans[0].start, spans[0].end];
  for (const s of spans.slice(1)) {
    if (s.start <= curEnd) curEnd = Math.max(curEnd, s.end);
    else {
      months += curEnd - curStart + 1;
      [curStart, curEnd] = [s.start, s.end];
    }
  }
  months += curEnd - curStart + 1;
  return Math.round((months / 12) * 10) / 10;
}

function headingFor(line: string): string | null {
  if (line.length > 45 || line.split(/\s+/).length > 6) return null;
  return HEADING_LOOKUP.get(normalizeHeading(line)) ?? null;
}

/** ALL-CAPS short lines that look like headings but aren't ones parsers know. */
function looksLikeCustomHeading(line: string): boolean {
  const letters = line.replace(/[^A-Za-z]/g, "");
  return letters.length >= 4 && line.length <= 32 && letters === letters.toUpperCase() && !DATE_RANGE.test(line) && !EMAIL.test(line);
}

export function parseResume(text: string, pages: number | null): ParsedResume {
  const lines = text.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

  // ── Sections ──
  type Block = { name: string; standard: string | null; lines: string[] };
  const header: string[] = [];
  const blocks: Block[] = [];
  for (const line of lines) {
    const canonical = headingFor(line);
    if (canonical) {
      blocks.push({ name: line, standard: canonical, lines: [] });
    } else if (blocks.length > 0 && looksLikeCustomHeading(line) && !BULLET_CHARS.test(line)) {
      blocks.push({ name: line, standard: null, lines: [] });
    } else if (blocks.length === 0) {
      header.push(line);
    } else {
      blocks[blocks.length - 1].lines.push(line);
    }
  }
  const wordsIn = (ls: string[]) => ls.join(" ").split(/\s+/).filter(Boolean).length;

  // ── Contact (header first, whole text as fallback) ──
  const headerText = header.join("\n");
  const email = (headerText.match(EMAIL) ?? text.match(EMAIL))?.[0] ?? null;
  const phone = findPhone(headerText) ?? findPhone(lines.slice(0, 12).join("\n"));
  const linkedin = (headerText.match(LINKEDIN) ?? text.match(LINKEDIN))?.[0] ?? null;
  const website =
    headerText
      .split(/[|\n•·]/)
      .map((p) => p.trim())
      .find((p) => !EMAIL.test(p) && !LINKEDIN.test(p) && WEBSITE.test(p))
      ?.match(WEBSITE)?.[0] ?? null;
  const name =
    header.find((l) => {
      const words = l.split(" ");
      return words.length >= 2 && words.length <= 5 && /^[A-Za-z .,'-]+$/.test(l) && !headingFor(l);
    }) ?? null;
  const location =
    header
      .flatMap((l) => l.split(/[|•·]/))
      .map((p) => p.trim())
      .find((p) => p !== name && /^[A-Z][A-Za-z .'-]+,\s*[A-Z][A-Za-z .'-]+$/.test(p) && p.length < 40) ?? null;

  // ── Experience, bullets, education, skills ──
  const experience: ParsedResume["experience"] = [];
  const bullets: string[] = [];
  const education: ParsedResume["education"] = [];
  const skills: string[] = [];

  for (const block of blocks) {
    if (block.standard === "experience" || block.standard === "projects" || block.standard === "leadership" || block.standard === "volunteer") {
      let current: ParsedResume["experience"][number] | null = null;
      let openBullet: number | null = null;
      let pendingBullet = false;
      for (let i = 0; i < block.lines.length; i++) {
        const line = block.lines[i];
        const range = line.match(DATE_RANGE)?.[0] ?? null;
        const wasPending = pendingBullet;
        pendingBullet = false;
        if (BULLET_CHARS.test(line)) {
          const content = line.replace(BULLET_CHARS, "").trim();
          if (!content) {
            pendingBullet = true; // glyph on its own line; the text follows
            continue;
          }
          bullets.push(content);
          openBullet = bullets.length - 1;
          if (current) current.bullets++;
        } else if (wasPending && !range) {
          bullets.push(line);
          openBullet = bullets.length - 1;
          if (current) current.bullets++;
        } else if (range && block.standard === "experience") {
          current = {
            title: line.replace(DATE_RANGE_G, "").replace(/[|,–—-]\s*$/, "").trim() || null,
            company: null,
            dates: range,
            bullets: 0,
          };
          const next = block.lines[i + 1];
          if (next && !BULLET_CHARS.test(next) && !DATE_RANGE.test(next)) current.company = next.replace(SINGLE_DATE, "").trim();
          experience.push(current);
          openBullet = null;
        } else if (openBullet != null && !range && /^[a-z(0-9]/.test(line)) {
          bullets[openBullet] += ` ${line}`; // wrapped continuation of the previous bullet
        } else if (!range && line.split(" ").length >= 8 && block.standard !== "projects") {
          // DOCX and some PDFs lose bullet glyphs: treat long sentences as bullets.
          bullets.push(line);
          openBullet = bullets.length - 1;
          if (current) current.bullets++;
        } else {
          openBullet = null;
        }
      }
    } else if (block.standard === "education") {
      for (const line of block.lines) {
        if (DEGREE.test(line) || DATE_RANGE.test(line)) {
          education.push({ line: line.replace(DATE_RANGE_G, "").trim(), dates: line.match(DATE_RANGE)?.[0] ?? line.match(SINGLE_DATE)?.[0] ?? null });
        }
      }
    } else if (block.standard === "skills") {
      for (const line of block.lines) {
        const list = line.includes(":") ? line.split(":").slice(1).join(":") : line;
        for (const item of list.split(/[,;|•·]/)) {
          const skill = item.replace(BULLET_CHARS, "").trim();
          if (skill && skill.length <= 40 && !skills.includes(skill)) skills.push(skill);
        }
      }
    }
  }

  return {
    contact: { name, email, phone, linkedin, website, location },
    sections: blocks.map((b) => ({ name: b.name, standard: b.standard, wordCount: wordsIn(b.lines) })),
    experience,
    education: education.slice(0, 8),
    skills: skills.slice(0, 80),
    bullets: bullets.map((b) => b.replace(/\s+/g, " ").trim()).filter((b) => b.length > 2),
    wordCount: wordsIn(lines),
    pages,
  };
}
