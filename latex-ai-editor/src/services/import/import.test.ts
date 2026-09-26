import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { renderResume, tex, unsupportedChars } from "./render";
import { verifyResume, squash } from "./verify";
import { ResumeDataSchema, type ResumeData } from "./resume-data";
import { buildFromProject, importTexFile, importZip, LatexImportError } from "./latex-import";
import { scanLatex } from "@/services/ai/inline-edit-validator";

const data: ResumeData = ResumeDataSchema.parse({
  name: "Jane O'Neil-Smith",
  headline: "Backend Engineer",
  contact: {
    email: "jane_doe@mail.com",
    phone: "+1 (555) 010-2030",
    location: "Austin, TX",
    links: [
      { label: "linkedin.com/in/jane", url: "linkedin.com/in/jane" },
      { label: "GitHub", url: "GitHub" },
      { label: "site", url: "https://jane.dev/a%20b#top" },
    ],
  },
  sections: [
    {
      title: "Experience",
      kind: "entries",
      entries: [
        {
          title: "Software Engineer",
          subtitle: "Acme & Co.",
          date: "Jan 2022 – Present",
          location: "Remote",
          bullets: ["Cut p99 latency by 35% and saved $12k/yr", "Built C# & C++ tools {fast}", "Owned on-call → 99.9% uptime ★"],
        },
      ],
    },
    { title: "Projects", kind: "entries", entries: [{ title: "Vero", date: "2026", bullets: [] }] },
    { title: "Skills", kind: "skills", groups: [{ label: "Languages", value: "Python, Go, SQL" }, { label: "", value: "Docker_Compose" }] },
    { title: "Awards", kind: "list", items: ["1st place, HackTX #42"] },
    { title: "Summary", kind: "text", text: "Engineer who ships.\n\nLoves ~ and ^ and \\ characters." },
    { title: "Empty", kind: "entries", entries: [] },
  ],
});

describe("tex()", () => {
  it("escapes LaTeX specials and maps symbols", () => {
    expect(tex("50% & $5 #1 a_b {x} ~ ^ \\ <>|")).toBe(
      "50\\% \\& \\$5 \\#1 a\\_b \\{x\\} \\textasciitilde{} \\textasciicircum{} \\textbackslash{} \\textless{}\\textgreater{}\\textbar{}"
    );
    expect(tex("A → B • C … café – naïve")).toBe("A $\\rightarrow$ B \\textbullet{} C \\ldots{} café – naïve");
    expect(tex("emoji 🚀 icon \uf0e0 ok")).toBe("emoji icon ok");
    expect(unsupportedChars("🚀 ★ café →")).toEqual(["🚀", "★"]);
  });
});

describe("renderResume", () => {
  const out = renderResume(data);
  it("produces balanced LaTeX with every section that has content", () => {
    const scan = scanLatex(out);
    expect(scan.braceDelta).toBe(0);
    expect([...scan.environments.values()].every((n) => n === 0)).toBe(true);
    expect(out).toContain("\\section{Experience}");
    expect(out).toContain("\\section{Skills}");
    expect(out).not.toContain("\\section{Empty}");
  });
  it("escapes content and builds safe links", () => {
    expect(out).toContain("Cut p99 latency by 35\\% and saved \\$12k/yr");
    expect(out).toContain("Built C\\# \\& C++ tools \\{fast\\}");
    expect(out).toContain("\\href{mailto:jane_doe@mail.com}{\\underline{jane\\_doe@mail.com}}");
    expect(out).toContain("\\href{https://linkedin.com/in/jane}");
    expect(out).toContain("\\href{https://jane.dev/a\\%20b\\#top}");
    expect(out).toMatch(/\$\|\$ GitHub \$\|\$/); // no URL → plain label
    expect(out).toContain("\\resumeProjectHeading{\\textbf{Vero}}{2026}");
    expect(out).toContain("\\textbf{Languages}{: Python, Go, SQL}");
  });
});

describe("verifyResume", () => {
  const source = `Jane O'Neil-Smith
Backend Engineer   jane_doe@mail.com   +1 (555) 010-2030
Experience
Software Engineer   Jan 2022 – Present
Acme & Co.   Remote
• Cut p99 latency by 35% and saved
$12k/yr
• Built C# & C++ tools {fast}
Awards
1st place, HackTX #42`;
  const small = ResumeDataSchema.parse({
    name: "Jane O'Neil-Smith",
    contact: { email: "jane_doe@mail.com" },
    sections: [
      {
        title: "Experience",
        kind: "entries",
        entries: [{ title: "Software Engineer", subtitle: "Acme & Co.", date: "Jan 2022 – Present", bullets: ["Cut p99 latency by 35% and saved $12k/yr"] }],
      },
    ],
  });
  it("ignores wrapping, punctuation and case", () => {
    expect(squash("De-\nveloped a REST API!")).toBe("developedarestapi");
    expect(verifyResume(small, source).unverified).toEqual([]);
  });
  it("flags invented text and new numbers", () => {
    const bad = structuredClone(small);
    bad.sections[0].entries[0].bullets.push("Cut p99 latency by 45% and saved $12k/yr", "Led a team of engineers at Google");
    expect(verifyResume(bad, source).unverified.map((u) => u.text)).toEqual([
      "Cut p99 latency by 45% and saved $12k/yr",
      "Led a team of engineers at Google",
    ]);
  });
  it("accepts text a two-column PDF extracted interleaved and without spaces", () => {
    const columns = "Skills   Education\nProficient:\n• Loremipsumdolorsitamet,consectetur\nC# • C • JavaScript • Python\nvenenatisnisiatsuscipit.\nSQL • CSS • HTML\nIndian Institute of Technology Madras,   7.77/10\nChennai";
    const d = ResumeDataSchema.parse({
      name: "",
      sections: [
        { title: "Skills", kind: "skills", groups: [{ label: "Proficient", value: "C#, C, JavaScript, Python, SQL, CSS, HTML" }] },
        { title: "Education", kind: "entries", entries: [{ title: "Indian Institute of Technology Madras, Chennai", date: "7.77/10", bullets: ["Lorem ipsum dolor sit amet, consectetur"] }] },
      ],
    });
    expect(verifyResume(d, columns).unverified).toEqual([]);
    d.sections[1].entries[0].bullets.push("Won the national Python programming olympiad");
    expect(verifyResume(d, columns).unverified.map((u) => u.text)).toEqual(["Won the national Python programming olympiad"]);
  });

  it("reports missed lines and coverage", () => {
    const r = verifyResume(small, source);
    expect(r.missed).toEqual(expect.arrayContaining(["Built C# & C++ tools {fast}", "1st place, HackTX #42"]));
    expect(r.coverage).toBeGreaterThan(0.5);
    expect(r.coverage).toBeLessThan(0.9);
  });
});

describe("LaTeX import", () => {
  const main = String.raw`\documentclass{myresume}
\usepackage{styles/mystyle}
\begin{document}
\input{sections/experience}
% \input{sections/old}   <- commented out, must stay as is
\includegraphics[width=2cm]{photo.png}
\end{document}`;

  it("inlines inputs, embeds class/style files and flattens their paths", () => {
    const r = buildFromProject(
      new Map([
        ["cv/main.tex", main],
        ["cv/sections/experience.tex", "\\section{Experience} Engineer at Acme."],
        ["cv/myresume.cls", "\\ProvidesClass{myresume}\n\\LoadClass{article}\n\\RequirePackage{styles/mystyle}"],
        ["cv/styles/mystyle.sty", "\\ProvidesPackage{mystyle}"],
      ]),
      ["cv/photo.png"]
    );
    expect(r.mainFile).toBe("cv/main.tex");
    expect(r.embedded.sort()).toEqual(["myresume.cls", "mystyle.sty"]);
    expect(r.content).toContain("\\begin{filecontents*}[overwrite]{myresume.cls}");
    expect(r.content).toContain("\\RequirePackage{mystyle}");
    expect(r.content).toContain("\\usepackage{mystyle}");
    expect(r.content).toContain("\\section{Experience} Engineer at Acme.");
    expect(r.content).toContain("% \\input{sections/old}");
    // Missing images become empty boxes instead of compile errors.
    expect(r.content).toContain("\\IfFileExists{#2}");
    expect(r.content.indexOf("\\AtBeginDocument")).toBeLessThan(r.content.indexOf("\\begin{document}"));
    expect(r.warnings.join(" ")).toMatch(/Images .* empty boxes/);
    expect(r.content.indexOf("filecontents")).toBeLessThan(r.content.indexOf("\\documentclass"));
  });

  it("warns about missing project files but not TeX Live ones", () => {
    const r = importTexFile(Buffer.from("\\documentclass{article}\n\\input{glyphtounicode}\n\\begin{document}\n\\input{parts/edu}\n\\end{document}"));
    expect(r.warnings.join(" ")).toContain("parts/edu");
    expect(r.warnings.join(" ")).not.toContain("glyphtounicode");
  });

  it("rejects files without a main document", () => {
    expect(() => importTexFile(Buffer.from("\\section{Only a fragment}"))).toThrow(LatexImportError);
  });

  it("reads an Overleaf zip and picks main.tex", async () => {
    const zip = new JSZip();
    zip.file("resume/main.tex", "\\documentclass{article}\n\\begin{document}\n\\input{edu}\n\\end{document}");
    zip.file("resume/edu.tex", "Education here");
    zip.file("resume/old.tex", "\\documentclass{article}\n\\begin{document}old\\end{document}");
    zip.file("__MACOSX/resume/._main.tex", "junk");
    const r = await importZip(await zip.generateAsync({ type: "nodebuffer" }));
    expect(r.mainFile).toBe("resume/main.tex");
    expect(r.content).toContain("Education here");
    await expect(importZip(Buffer.from("PK not a zip"))).rejects.toThrow(LatexImportError);
  });
});
