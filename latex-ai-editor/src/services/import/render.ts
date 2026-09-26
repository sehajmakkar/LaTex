import type { ResumeData, ResumeSection } from "@/services/import/resume-data";

/**
 * Renders structured resume data into LaTeX using the Jake's Resume layout (our
 * default template, and the most-used resume on Overleaf). All text goes
 * through `tex()`, so any content compiles: the AI never writes LaTeX here.
 */

/** Characters pdfLaTeX can't typeset in text mode, mapped to safe equivalents. */
const CHAR_MAP: Record<string, string> = {
  "•": "\\textbullet{}",
  "·": "\\textperiodcentered{}",
  "→": "$\\rightarrow$",
  "←": "$\\leftarrow$",
  "↑": "$\\uparrow$",
  "↓": "$\\downarrow$",
  "≈": "$\\approx$",
  "≥": "$\\geq$",
  "≤": "$\\leq$",
  "×": "$\\times$",
  "±": "$\\pm$",
  "…": "\\ldots{}",
  "€": "\\texteuro{}",
  "₹": "Rs.",
  "™": "\\texttrademark{}",
  "®": "\\textregistered{}",
  "©": "\\textcopyright{}",
  "°": "\\textdegree{}",
  "\u00a0": " ",
  "\u200b": "",
  "\ufeff": "",
};

/** Escapes text for LaTeX. Returns the escaped text; unsupported symbols are dropped. */
export function tex(input: string): string {
  let out = "";
  for (const ch of input.normalize("NFC")) {
    if (ch === "\\") out += "\\textbackslash{}";
    else if ("&%$#_{}".includes(ch)) out += `\\${ch}`;
    else if (ch === "~") out += "\\textasciitilde{}";
    else if (ch === "^") out += "\\textasciicircum{}";
    else if (ch === "<") out += "\\textless{}";
    else if (ch === ">") out += "\\textgreater{}";
    else if (ch === "|") out += "\\textbar{}";
    else if (ch in CHAR_MAP) out += CHAR_MAP[ch];
    else if (/[\u0000-\u0008\u000b-\u001f\u007f]/.test(ch)) continue;
    // Latin letters with accents, general punctuation (dashes, quotes) are fine in pdfLaTeX.
    else if (/[\u0020-\u024f\u2010-\u2027\u2030-\u205e\n\t]/u.test(ch)) out += ch;
    // Anything else (emoji, icons from icon fonts, CJK…) would stop pdfLaTeX.
    else continue;
  }
  return out.replace(/[ \t]+/g, " ").trim();
}

/** Characters that `tex()` drops, so the import report can mention them. */
export function unsupportedChars(input: string): string[] {
  const dropped = new Set<string>();
  for (const ch of input.normalize("NFC")) {
    if (ch in CHAR_MAP || /[\u0020-\u024f\u2010-\u2027\u2030-\u205e\n\t\\]/u.test(ch)) continue;
    if (/[\u0000-\u001f\u007f]/.test(ch)) continue;
    dropped.add(ch);
  }
  return [...dropped];
}

function hrefUrl(raw: string, label: string): string | null {
  let url = raw.trim() || label.trim();
  if (!url) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) url = `mailto:${url}`;
  else if (!/^(https?:|mailto:)/i.test(url)) {
    if (!/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(url)) return null; // not a URL (e.g. just "GitHub")
    url = `https://${url}`;
  }
  // Inside \href, % and # must be escaped; braces and backslashes are never valid here.
  return url.replace(/[\\{}\s]/g, "").replace(/%/g, "\\%").replace(/#/g, "\\#");
}

const PREAMBLE = String.raw`\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}

\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\pdfgentounicode=1

\newcommand{\resumeItem}[1]{
  \item\small{
    {#1 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-7pt}
}

\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}`;

function header(data: ResumeData): string {
  const parts: string[] = [];
  const { phone, email, location, links } = data.contact;
  if (phone?.trim()) parts.push(tex(phone));
  if (email?.trim()) {
    const url = hrefUrl(email, email);
    parts.push(url ? `\\href{${url}}{\\underline{${tex(email)}}}` : tex(email));
  }
  for (const link of links) {
    const label = tex(link.label || link.url);
    if (!label) continue;
    const url = hrefUrl(link.url, link.label);
    parts.push(url ? `\\href{${url}}{\\underline{${label}}}` : label);
  }
  if (location?.trim()) parts.push(tex(location));

  const lines = [`    \\textbf{\\Huge \\scshape ${tex(data.name) || "Your Name"}} \\\\ \\vspace{1pt}`];
  if (data.headline?.trim()) lines.push(`    \\small ${tex(data.headline)} \\\\ \\vspace{1pt}`);
  if (parts.length) lines.push(`    \\small ${parts.join(" $|$ ")}`);
  return ["\\begin{center}", ...lines, "\\end{center}"].join("\n");
}

function bullets(items: string[], indent: string): string[] {
  const kept = items.map(tex).filter(Boolean);
  if (!kept.length) return [];
  return [`${indent}\\resumeItemListStart`, ...kept.map((b) => `${indent}  \\resumeItem{${b}}`), `${indent}\\resumeItemListEnd`];
}

function section(s: ResumeSection): string | null {
  const title = tex(s.title) || "Section";
  const body: string[] = [];

  if (s.kind === "entries" && s.entries.length) {
    body.push("  \\resumeSubHeadingListStart");
    for (const e of s.entries) {
      const [t, sub, date, loc] = [tex(e.title), tex(e.subtitle), tex(e.date), tex(e.location)];
      if (!t && !sub && !e.bullets.length) continue;
      if (sub || loc) {
        body.push("    \\resumeSubheading", `      {${t}}{${date}}`, `      {${sub}}{${loc}}`);
      } else {
        body.push(`    \\resumeProjectHeading{\\textbf{${t}}}{${date}}`);
      }
      body.push(...bullets(e.bullets, "      "));
    }
    body.push("  \\resumeSubHeadingListEnd");
  } else if (s.kind === "skills" && s.groups.length) {
    const rows = s.groups
      .map((g) => [tex(g.label), tex(g.value)] as const)
      .filter(([l, v]) => l || v)
      .map(([l, v]) => (l ? `    \\textbf{${l}}{: ${v}}` : `    ${v}`));
    if (rows.length) {
      body.push(" \\begin{itemize}[leftmargin=0.15in, label={}]", "    \\small{\\item{", rows.join(" \\\\\n"), "    }}", " \\end{itemize}");
    }
  } else if (s.kind === "text" && s.text.trim()) {
    const paragraphs = s.text.split(/\n\s*\n/).map(tex).filter(Boolean);
    body.push(`{\\small ${paragraphs.join("\\par\n")}}`);
  }
  // Lists, and any section whose content landed in `items` instead.
  if (!body.length) {
    const items = s.items.map(tex).filter(Boolean);
    if (items.length) body.push("  \\begin{itemize}[leftmargin=0.15in]", ...items.map((i) => `    \\resumeItem{${i}}`), "  \\end{itemize}");
  }
  if (!body.length) return null;
  return [`%-----------${title.toUpperCase().replace(/[^A-Z0-9 ]/g, "")}-----------`, `\\section{${title}}`, ...body].join("\n");
}

export function renderResume(data: ResumeData): string {
  const sections = data.sections.map(section).filter((s): s is string => s !== null);
  return [
    "% Imported into Vero. Every line was taken from your file: check the import report for anything flagged.",
    PREAMBLE,
    "",
    "%-------------------------------------------",
    "\\begin{document}",
    "",
    header(data),
    "",
    sections.join("\n\n"),
    "",
    "\\end{document}",
    "",
  ].join("\n");
}
