import type { Category, Finding, LayoutSignals, ParsedResume } from "@/services/ats/types";
import { DATE_RANGE } from "@/services/ats/parse";

const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)));
const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));
const pass = (title: string, detail?: string): Finding => ({ status: "pass", title, detail });
const warn = (title: string, detail?: string): Finding => ({ status: "warn", title, detail });
const fail = (title: string, detail?: string): Finding => ({ status: "fail", title, detail });

const STRONG_VERBS = new Set(
  (
    "accelerated achieved advised analyzed applied architected authored automated boosted built championed coached collaborated conducted " +
    "consolidated consulted created cut devised facilitated debugged decreased defined delivered deployed designed developed directed doubled drove " +
    "eliminated enabled engineered enhanced established evaluated executed expanded founded generated grew guided halved " +
    "identified implemented improved increased influenced initiated integrated introduced launched led managed maximized " +
    "mentored migrated minimized modernized negotiated optimized orchestrated organized overhauled oversaw owned partnered " +
    "piloted pioneered presented prepared prioritized produced programmed published raised rebuilt redesigned reduced refactored " +
    "resolved restructured revamped saved scaled secured served shipped simplified spearheaded standardized streamlined " +
    "strengthened supervised taught tested trained transformed tripled unified upgraded won wrote"
  ).split(" ")
);
const WEAK_STARTS = [
  "responsible for", "worked on", "worked with", "helped", "assisted", "involved in", "participated in", "tasked with",
  "duties included", "in charge of", "handled", "was", "did", "made", "used", "working on", "part of",
];

const BUZZWORDS = [
  "team player", "hard-working", "hardworking", "hard working", "detail-oriented", "detail oriented", "results-driven",
  "results driven", "results-oriented", "go-getter", "think outside the box", "synergy", "self-starter", "self starter",
  "dynamic", "passionate", "motivated", "proactive", "best of breed", "go-to person", "guru", "ninja", "rockstar",
  "thought leader", "value add", "strategic thinker", "fast learner", "quick learner", "people person", "track record",
  "move the needle", "excellent communication skills", "go the extra mile", "wear many hats",
];
const FILLERS = ["very", "really", "various", "several", "basically", "actually", "successfully", "in order to", "a lot of", "etc"];

const hasNumber = (bullet: string) =>
  /\d/.test(bullet.replace(/\b(19|20)\d{2}\b/g, "")) || /\b(one|two|three|four|five|six|seven|eight|nine|ten|dozens?|hundreds?|thousands?|millions?)\b/i.test(bullet);

/** Accepts past tense (Led, Built) and present tense for current roles (Advise, Manages). */
function isStrongVerb(word: string): boolean {
  if (STRONG_VERBS.has(word)) return true;
  const base = word.replace(/s$/, "");
  return [base + "ed", base + "d", base.replace(/y$/, "ied"), base + base.slice(-1) + "ed"].some((form) => STRONG_VERBS.has(form)) ||
    ["lead", "build", "write", "drive", "grow", "win", "cut", "run", "teach", "own"].includes(base);
}

function firstWord(bullet: string) {
  return bullet.toLowerCase().replace(/^[^a-z]+/, "").split(/\s+/)[0] ?? "";
}

// ── ATS parsing ──────────────────────────────────────────────────────────────

function contactCheck(p: ParsedResume): Category {
  const c = p.contact;
  const findings: Finding[] = [
    c.name ? pass("Name found", c.name) : fail("No name found at the top", "Put your full name on the first line, as plain text."),
    c.email ? pass("Email found", c.email) : fail("No email address found"),
    c.phone ? pass("Phone number found", c.phone) : fail("No phone number found", "Recruiters and ATS forms expect one."),
    c.linkedin || c.website
      ? pass("Profile link found", c.linkedin ?? c.website ?? undefined)
      : warn("No LinkedIn or portfolio link", "Most ATS store a profile URL; add LinkedIn or GitHub/portfolio."),
    c.location ? pass("Location found", c.location) : warn("No location found", "Add City, Country. Many ATS filter by location."),
  ];
  const score = (c.name ? 3 : 0) + (c.email ? 3 : 0) + (c.phone ? 2 : 0) + (c.linkedin || c.website ? 1 : 0) + (c.location ? 1 : 0);
  return {
    id: "contact",
    group: "parsing",
    title: "Contact details",
    description: "Can the ATS fill in your name, email, phone and links automatically?",
    score: score,
    findings,
    tip: "Keep contact details in the body of the page (not a header/footer or text box), in plain text, on one or two lines.",
  };
}

function sectionsCheck(p: ParsedResume): Category {
  const has = (s: string) => p.sections.some((x) => x.standard === s && x.wordCount > 0);
  const custom = p.sections.filter((s) => s.standard === null).map((s) => s.name);
  const hasWork = has("experience") || has("projects");
  const findings: Finding[] = [
    has("experience")
      ? pass("Experience section found")
      : has("projects")
        ? warn("No Experience section", "Projects were found. That's fine early in your career, but an ATS maps jobs from 'Experience'.")
        : fail("No Experience section found", "Use a heading like 'Experience' or 'Work Experience'."),
    has("education") ? pass("Education section found") : fail("No Education section found"),
    has("skills") ? pass("Skills section found") : fail("No Skills section found", "A dedicated 'Skills' section is where ATS look for keywords."),
  ];
  if (custom.length > 0) {
    findings.push(warn("Headings an ATS may not recognise", `${custom.slice(0, 5).join(", ")}. Rename to standard headings where you can.`));
  }
  const score = (hasWork ? (has("experience") ? 4 : 3) : 0) + (has("education") ? 3 : 0) + (has("skills") ? 3 : 0) - Math.min(2, custom.length);
  return {
    id: "sections",
    group: "parsing",
    title: "Section headings",
    description: "ATS map your resume into fields using standard section names.",
    score: clamp(score),
    findings,
    tip: "Use conventional headings: Summary, Experience, Education, Skills, Projects, Certifications.",
  };
}

function datesCheck(p: ParsedResume, text: string): Category {
  const roles = p.experience;
  const findings: Finding[] = [];
  let score = 10;
  if (roles.length === 0) {
    const anyDates = DATE_RANGE.test(text);
    findings.push(anyDates ? warn("No jobs with dates were detected in Experience") : fail("No date ranges found", "Add start and end dates to each role and degree."));
    score = anyDates ? 6 : 2;
  } else {
    findings.push(pass(`${roles.length} role${roles.length > 1 ? "s" : ""} with dates detected`));
  }
  const ranges = [...text.matchAll(new RegExp(DATE_RANGE.source, "gi"))].map((m) => m[0]);
  const formats = new Set(
    ranges.map((r) => (/[a-z]{3}/i.test(r) ? "month-name" : /\d{1,2}\//.test(r) ? "numeric" : "year-only"))
  );
  if (formats.size > 1) {
    findings.push(warn("Mixed date formats", "Use one format everywhere, e.g. 'Jan 2024 – Present'."));
    score -= 2;
  } else if (ranges.length > 0) {
    findings.push(pass("Consistent date format"));
  }
  if (ranges.length > 0 && ranges.every((r) => !/[a-z]{3}/i.test(r) && !/\d\//.test(r))) {
    findings.push(warn("Years only, no months", "Months help ATS calculate your experience accurately."));
    score -= 1;
  }
  return {
    id: "dates",
    group: "parsing",
    title: "Dates",
    description: "ATS calculate years of experience from your date ranges.",
    score: clamp(score),
    findings,
    tip: "Give every role and degree a start and end date in the same format: 'Mon YYYY – Mon YYYY' or 'Present'.",
  };
}

function layoutCheck(l: LayoutSignals): Category {
  const findings: Finding[] = [];
  let score = 10;
  if (!l.hasTextLayer) {
    findings.push(fail("No readable text", "This looks like a scanned or image-only file. ATS can't read it at all; export a text-based PDF."));
    score = 0;
  } else {
    findings.push(pass("Text is machine-readable"));
  }
  if (l.multiColumn) {
    findings.push(fail("Multi-column layout detected", "Many ATS read across columns and scramble your sections. A single column is safest."));
    score -= 4;
  } else if (l.multiColumn === false) {
    findings.push(pass("Single-column layout"));
  }
  if (l.tables) {
    findings.push(fail(`${l.tables} table${l.tables > 1 ? "s" : ""} found`, "Tables are a common cause of parse errors; use plain lines and tabs instead."));
    score -= 3;
  }
  if (l.images) {
    findings.push(warn(`${l.images} image${l.images > 1 ? "s" : ""} found`, "ATS ignore images; make sure no information lives only in a picture or logo."));
    score -= 1;
  }
  if (l.unreadableChars > 3) {
    findings.push(warn("Icons or special symbols", "Icon fonts (e.g. phone or email icons) come out as garbage characters in many parsers. Use plain text labels."));
    score -= 2;
  }
  if (l.pages && l.pages > 2) {
    findings.push(warn(`${l.pages} pages`, "Keep it to one page (early career) or two (senior)."));
    score -= 2;
  }
  return {
    id: "layout",
    group: "parsing",
    title: "Layout & file",
    description: "Formatting that makes parsers lose or scramble information.",
    score: clamp(score),
    findings,
    tip: "Single column, no tables or text boxes, standard fonts, contact info in the body, exported as a text-based PDF or DOCX.",
  };
}

// ── Impact ───────────────────────────────────────────────────────────────────

function quantificationCheck(p: ParsedResume): Category {
  const n = p.bullets.length;
  const withNumbers = p.bullets.filter(hasNumber);
  const ratio = pct(withNumbers.length, n);
  const without = p.bullets.filter((b) => !hasNumber(b));
  return {
    id: "quantification",
    group: "impact",
    title: "Quantified impact",
    description: "Numbers make achievements concrete: %, $, time saved, users, scale.",
    score: n === 0 ? 0 : clamp((ratio / 60) * 10),
    findings: [
      n === 0
        ? fail("No bullet points detected", "Describe each role with 3–5 achievement bullets.")
        : ratio >= 60
          ? pass(`${ratio}% of bullets include a number`)
          : ratio >= 30
            ? warn(`${ratio}% of bullets include a number`, "Aim for at least 60%.")
            : fail(`Only ${ratio}% of bullets include a number`, "Aim for at least 60%."),
    ],
    items: without.slice(0, 8).map((b) => ({ label: b, note: "No measurable result" })),
    tip: "Add the result of each action: how much, how many, how fast. If you don't know the exact figure, estimate honestly ('~30%').",
  };
}

function actionVerbsCheck(p: ParsedResume): Category {
  const n = p.bullets.length;
  const weak = p.bullets.filter((b) => WEAK_STARTS.some((w) => b.toLowerCase().startsWith(w)));
  const strong = p.bullets.filter((b) => isStrongVerb(firstWord(b)));
  const ratio = pct(strong.length, n);
  const findings: Finding[] = [
    ratio >= 70 ? pass(`${ratio}% of bullets start with a strong action verb`) : warn(`${ratio}% of bullets start with a strong action verb`, "Aim for 70% or more."),
  ];
  if (weak.length) findings.push(fail(`${weak.length} bullet${weak.length > 1 ? "s" : ""} start with a weak phrase`, "e.g. 'Responsible for', 'Worked on', 'Helped'."));
  return {
    id: "action_verbs",
    group: "impact",
    title: "Action verbs",
    description: "Recruiters and AI screeners look for ownership: Led, Built, Reduced, Launched.",
    score: n === 0 ? 0 : clamp((ratio / 70) * 10 - weak.length),
    findings,
    items: weak.slice(0, 8).map((b) => ({ label: b, note: "Weak opening" })),
    tip: "Start each bullet with a past-tense verb that shows what you did (Built, Cut, Led), not what you were assigned.",
  };
}

function repetitionCheck(p: ParsedResume): Category {
  const counts = new Map<string, number>();
  for (const b of p.bullets) {
    const w = firstWord(b);
    if (w.length > 2) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const repeated = [...counts.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]);
  return {
    id: "repetition",
    group: "impact",
    title: "Repetition",
    description: "Starting many bullets with the same verb reads as filler.",
    score: p.bullets.length === 0 ? 0 : clamp(10 - repeated.reduce((s, [, c]) => s + (c - 2) * 2, 0)),
    findings: repeated.length
      ? repeated.slice(0, 4).map(([w, c]) => warn(`"${w[0].toUpperCase()}${w.slice(1)}" starts ${c} bullets`, "Vary it: Built, Designed, Shipped, Delivered…"))
      : [pass("No overused opening verbs")],
    tip: "Use each opening verb at most twice across the resume.",
  };
}

// ── Brevity & style ──────────────────────────────────────────────────────────

function lengthCheck(p: ParsedResume): Category {
  const words = p.wordCount;
  const findings: Finding[] = [];
  let score = 10;
  if (words < 250) {
    findings.push(fail(`${words} words, too thin`, "Add detail to your experience and projects; aim for 400–800 words."));
    score = 4;
  } else if (words < 400) {
    findings.push(warn(`${words} words, a little light`, "Aim for 400–800 words."));
    score = 7;
  } else if (words > 1000) {
    findings.push(warn(`${words} words, quite long`, "Recruiters skim; cut older or less relevant details."));
    score = 6;
  } else {
    findings.push(pass(`${words} words, a good length`));
  }
  if (p.pages && p.pages > 2) {
    findings.push(fail(`${p.pages} pages`, "Keep it to 1–2 pages."));
    score -= 3;
  } else if (p.pages) {
    findings.push(pass(`${p.pages} page${p.pages > 1 ? "s" : ""}`));
  }
  return {
    id: "length",
    group: "style",
    title: "Length",
    description: "Long enough to show impact, short enough to skim in seconds.",
    score: clamp(score),
    findings,
    tip: "One page for under ~7 years of experience, two pages beyond that.",
  };
}

function bulletLengthCheck(p: ParsedResume): Category {
  const words = (b: string) => b.split(/\s+/).length;
  const long = p.bullets.filter((b) => words(b) > 32);
  const short = p.bullets.filter((b) => words(b) < 6);
  const findings: Finding[] = [];
  if (long.length) findings.push(warn(`${long.length} bullet${long.length > 1 ? "s are" : " is"} too long`, "Over ~2 lines. Split them or cut filler."));
  if (short.length) findings.push(warn(`${short.length} bullet${short.length > 1 ? "s are" : " is"} very short`, "Add what you did and the result."));
  if (!findings.length) findings.push(pass("Bullets are a readable length"));
  return {
    id: "bullet_length",
    group: "style",
    title: "Bullet length",
    description: "One to two lines per bullet is easiest to scan.",
    score: p.bullets.length === 0 ? 0 : clamp(10 - long.length * 1.5 - short.length),
    findings,
    items: long.slice(0, 5).map((b) => ({ label: b, note: `${words(b)} words` })),
    tip: "Keep bullets between ~10 and ~30 words: action, what, result.",
  };
}

function buzzwordsCheck(text: string): Category {
  const lower = text.toLowerCase();
  const found = BUZZWORDS.filter((b) => new RegExp(`\\b${b.replace(/[-\s]/g, "[-\\s]")}\\b`).test(lower));
  const pronouns = (text.match(/\b(I|me|my|mine|myself)\b/g) ?? []).length;
  const fillers = FILLERS.filter((f) => new RegExp(`\\b${f}\\b`).test(lower));
  const findings: Finding[] = [];
  findings.push(found.length ? warn(`${found.length} buzzword${found.length > 1 ? "s" : ""} or cliché${found.length > 1 ? "s" : ""}`, "Show the quality with an example instead of claiming it.") : pass("No buzzwords or clichés"));
  findings.push(pronouns ? warn(`Personal pronouns used ${pronouns} time${pronouns > 1 ? "s" : ""}`, "Resumes are written without 'I', 'me' or 'my'.") : pass("No personal pronouns"));
  if (fillers.length) findings.push(warn("Filler words", fillers.join(", ")));
  return {
    id: "buzzwords",
    group: "style",
    title: "Buzzwords & filler",
    description: "Vague self-descriptions take space without proving anything.",
    score: clamp(10 - found.length * 1.5 - Math.min(3, pronouns) - fillers.length * 0.5),
    findings,
    items: found.map((b) => ({ label: b })),
    tip: "Replace adjectives about yourself ('passionate', 'detail-oriented') with a result that proves them.",
  };
}

function unnecessarySectionsCheck(p: ParsedResume, text: string): Category {
  const has = (s: string) => p.sections.some((x) => x.standard === s);
  const personal = /\b(date of birth|d\.o\.b|dob|marital status|nationality|religion|gender|father'?s name)\b/i.test(text);
  const findings: Finding[] = [
    has("references") || /references available/i.test(text)
      ? fail("References section", "Recruiters ask for references later; remove it to save space.")
      : pass("No references section"),
    has("objective") ? warn("Objective statement", "Objectives are outdated; use a 2–3 line Summary aimed at the role instead.") : pass("No objective"),
    personal ? fail("Personal details", "Date of birth, marital status, religion or gender invite bias and aren't needed.") : pass("No unnecessary personal details"),
  ];
  if (has("interests")) findings.push(warn("Hobbies / interests", "Fine if relevant or space allows; cut it first when you need room."));
  const score = 10 - (has("references") || /references available/i.test(text) ? 3 : 0) - (has("objective") ? 2 : 0) - (personal ? 4 : 0) - (has("interests") ? 1 : 0);
  return {
    id: "unnecessary_sections",
    group: "style",
    title: "Unnecessary sections",
    description: "Outdated sections waste space and can signal an old-style resume.",
    score: clamp(score),
    findings,
  };
}

/** Deterministic half of "Spelling & consistency"; the AI review adds spelling. */
export function consistencyFindings(p: ParsedResume): { findings: Finding[]; penalty: number } {
  const findings: Finding[] = [];
  let penalty = 0;
  const withPeriod = p.bullets.filter((b) => /\.\s*$/.test(b)).length;
  const share = p.bullets.length ? withPeriod / p.bullets.length : 0;
  if (p.bullets.length >= 4 && share > 0.2 && share < 0.8) {
    findings.push(warn("Inconsistent bullet punctuation", "Some bullets end with a period and some don't. Pick one style."));
    penalty += 2;
  } else if (p.bullets.length >= 4) {
    findings.push(pass("Consistent bullet punctuation"));
  }
  return { findings, penalty };
}

export function runRuleChecks(parsed: ParsedResume, layout: LayoutSignals, text: string): Category[] {
  return [
    contactCheck(parsed),
    sectionsCheck(parsed),
    datesCheck(parsed, text),
    layoutCheck(layout),
    quantificationCheck(parsed),
    actionVerbsCheck(parsed),
    repetitionCheck(parsed),
    lengthCheck(parsed),
    bulletLengthCheck(parsed),
    buzzwordsCheck(text),
    unnecessarySectionsCheck(parsed, text),
  ];
}
