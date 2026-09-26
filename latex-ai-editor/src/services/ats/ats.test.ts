import { describe, expect, it } from "vitest";
import { findPhone, parseResume, yearsOfExperience } from "./parse";
import { mentions, aliasesFor } from "./skills";
import { buildAiJobMatch } from "./match";
import { redactForPlan } from "./redact";
import { runRuleChecks } from "./checks";
import type { AtsReportV2, LayoutSignals } from "./types";

const RESUME = `Jane Doe
jane@example.com | +1 (555) 123-4567 | linkedin.com/in/jane | Berlin, Germany
Work Experience
Software Engineer   Jan 2022 – Present
Acme Corp
• Built a Node.js and PostgreSQL API serving 2M requests a day
• Responsible for code reviews
Education
BSc Computer Science, TU Berlin   2017 – 2021
Technical Skills
Languages: C++, TypeScript, Python`;

const layout: LayoutSignals = { fileType: "pdf", pages: 1, hasTextLayer: true, multiColumn: false, tables: null, images: null, unreadableChars: 0 };

describe("parse", () => {
  const parsed = parseResume(RESUME, 1);
  it("reads contact details and maps synonym headings", () => {
    expect(parsed.contact).toMatchObject({ name: "Jane Doe", email: "jane@example.com", linkedin: "linkedin.com/in/jane", location: "Berlin, Germany" });
    expect(parsed.sections.map((s) => s.standard)).toEqual(["experience", "education", "skills"]);
  });
  it("finds roles, bullets and skills", () => {
    expect(parsed.experience[0]).toMatchObject({ title: "Software Engineer", company: "Acme Corp", bullets: 2 });
    expect(parsed.skills).toEqual(["C++", "TypeScript", "Python"]);
  });
  it("never takes a date range for a phone number", () => {
    expect(findPhone("2019 - 2021")).toBeNull();
    expect(findPhone("Tel: +91 90283 20000")).toBe("+91 90283 20000");
  });
  it("merges overlapping date ranges into years of experience", () => {
    expect(yearsOfExperience(["Jan 2020 – Dec 2020", "Jun 2020 – Dec 2021"])).toBe(2);
  });
});

describe("keyword matching", () => {
  it("matches symbols and dotted names on word boundaries", () => {
    expect(mentions("Languages: C++, Node.js", "c++")).toBe(true);
    expect(mentions("I like cats", "c")).toBe(false);
    expect(mentions("React Native app", "react")).toBe(true);
  });
  it("expands dictionary aliases", () => {
    expect(aliasesFor("k8s")).toContain("kubernetes");
  });
});

describe("AI job match verification", () => {
  const parsed = parseResume(RESUME, 1);
  const match = buildAiJobMatch(
    {
      roleTitle: "Software Engineer",
      yearsRequired: 0,
      summary: "",
      requirements: [
        { skill: "Postgres", kind: "tool", importance: "required", aliases: [], status: "found", evidence: "" },
        { skill: "Kubernetes", kind: "tool", importance: "required", aliases: [], status: "found", evidence: "Deployed services on Kubernetes" },
        { skill: "Scalability", kind: "hard", importance: "preferred", aliases: [], status: "related", evidence: "serving 2M requests a day" },
      ],
    },
    RESUME,
    parsed,
    "job_description"
  );
  it("confirms exact matches through aliases", () => expect(match.requirements[0].status).toBe("exact"));
  it("rejects evidence the resume doesn't contain", () => expect(match.requirements[1].status).toBe("missing"));
  it("accepts semantic matches with real evidence", () => expect(match.requirements[2].status).toBe("semantic"));
  it("counts the title", () => expect(match.titleMatch).toBe(true));
});

describe("rule checks", () => {
  const cats = Object.fromEntries(runRuleChecks(parseResume(RESUME, 1), layout, RESUME).map((c) => [c.id, c]));
  it("flags weak openings", () => expect(cats.action_verbs.findings.some((f) => f.status === "fail")).toBe(true));
  it("fails a multi-column layout", () => {
    const [layoutCheck] = runRuleChecks(parseResume(RESUME, 1), { ...layout, multiColumn: true }, RESUME).filter((c) => c.id === "layout");
    expect(layoutCheck.score).toBeLessThanOrEqual(6);
  });
});

describe("redaction", () => {
  const report = {
    categories: [
      {
        id: "bullet_strength",
        bulletFixes: [1, 2, 3].map((i) => ({ original: `b${i}`, issues: [], rewrite: `r${i}`, prompt: `p${i}` })),
      },
    ],
    jobMatch: {
      requirements: Array.from({ length: 7 }, (_, i) => ({ skill: `s${i}`, status: "missing", evidence: null })),
    },
  } as unknown as AtsReportV2;
  it("keeps everything for Pro", () => expect(redactForPlan(report, "pro")).toBe(report));
  it("locks details beyond the free allowance, server-side", () => {
    const free = redactForPlan(report, "free");
    const fixes = free.categories[0].bulletFixes!;
    expect(fixes[2]).toMatchObject({ rewrite: null, prompt: null, locked: true });
    expect(fixes[1].prompt).toBe("p2");
    expect(free.jobMatch!.requirements.filter((r) => r.locked)).toHaveLength(2);
    expect(JSON.stringify(free)).not.toContain("r3");
    expect(free.redacted).toBe(true);
  });
});
