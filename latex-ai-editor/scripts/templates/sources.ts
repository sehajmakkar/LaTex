/**
 * The template catalog: popular, openly licensed resume/CV templates, imported
 * unchanged from their original repositories with the same pipeline users get
 * for an Overleaf .zip (src/services/import/latex-import.ts). We don't write or
 * edit any template's LaTeX; only the name, tags and description are ours.
 *
 * Only licenses that allow redistribution are included (MIT, Apache-2.0,
 * LPPL-1.3c, CC-BY-4.0). Repositories without a license are left out.
 * Every source is pinned to a commit so the catalog can be rebuilt exactly.
 *
 * To add an Overleaf gallery template: open it on overleaf.com → "Open as
 * Template" → Menu → Download → Source, check its license on the gallery page,
 * save the .zip under templates-src/ and add an entry with `zip`.
 */

import { TEMPLATE_TAGS } from "@/templates/common";

export const NICHES = TEMPLATE_TAGS;
export type Niche = (typeof NICHES)[number];

export type TemplateSource = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: Niche[];
  author: string;
  license: "MIT" | "Apache-2.0" | "LPPL-1.3c" | "CC-BY-4.0";
  /** Page to credit (the repo or gallery page). */
  url: string;
  /** GitHub source: repo + pinned commit; or a zip URL pinned by checksum (e.g. CTAN); or a local .zip under templates-src/. */
  repo?: string;
  ref?: string;
  zipUrl?: string;
  sha256?: string;
  zip?: string;
  /** Folder inside the repo holding this template, and its main file (relative to it). */
  root?: string;
  main: string;
  /** Class/style names to take from TeX Live instead of the source (when the source needs a newer TeX Live). */
  useInstalled?: string[];
  /** Uses a photo, which shows as an empty box until images are supported. */
  hasPhoto?: boolean;
  /** Left out of the catalog, with the reason (kept here so it's retried when the reason goes away). */
  skip?: string;
};

const gh = (repo: string) => `https://github.com/${repo}`;

export const TEMPLATE_SOURCES: TemplateSource[] = [
  // ── Software engineering / ATS-friendly one-column ──────────────────────────
  {
    id: "jakes-resume",
    name: "Jake's Resume",
    description: "The most-used software engineering resume on Overleaf: one column, ATS-friendly, dense but readable.",
    category: "Tech",
    tags: ["Most popular", "Software engineering", "Students & new grads", "Product & business"],
    author: "Jake Gutierrez",
    license: "MIT",
    url: gh("jakegut/resume"),
    repo: "jakegut/resume",
    ref: "3e64a933141a",
    main: "resume.tex",
  },
  {
    id: "sb2nov-resume",
    name: "Software Developer Resume (sb2nov)",
    description: "The classic one-page developer resume that Jake's is based on. 7k GitHub stars.",
    category: "Tech",
    tags: ["Most popular", "Software engineering"],
    author: "Sourabh Bajaj",
    license: "MIT",
    url: gh("sb2nov/resume"),
    repo: "sb2nov/resume",
    ref: "7b70fe14876f",
    main: "sourabh_bajaj_resume.tex",
  },
  {
    id: "mcdowell-cv",
    skip: "Needs the Times New Roman font (not in TeX Live). Retry when projects can include font files.",
    name: "McDowell CV",
    description:
      "Follows the format recommended by Gayle Laakmann McDowell (Cracking the Coding Interview, Cracking the PM Interview). Popular for FAANG SWE and PM roles.",
    category: "Tech",
    tags: ["Most popular", "Software engineering", "Product & business"],
    author: "Daniil Belyakov",
    license: "MIT",
    url: gh("dnl-blkv/mcdowell-cv"),
    repo: "dnl-blkv/mcdowell-cv",
    ref: "b7e2d271c648",
    main: "McDowell_CV_Template.tex",
  },
  {
    id: "devcelio-resume",
    name: "Clean Developer Resume",
    description: "A minimal, ATS-friendly resume focused on experience and impact.",
    category: "Tech",
    tags: ["Software engineering", "Students & new grads"],
    author: "Celio B. Junior",
    license: "Apache-2.0",
    url: gh("devcelio/resume-template"),
    repo: "devcelio/resume-template",
    ref: "2c12e64a5c7f",
    root: "resumes/en",
    main: "resume.tex",
  },
  {
    id: "rover-base",
    name: "Rover Resume",
    description: "ATS-friendly one-column resume with clear hierarchy.",
    category: "Tech",
    tags: ["Software engineering", "Product & business"],
    author: "Subidit",
    license: "CC-BY-4.0",
    url: gh("subidit/rover-resume"),
    repo: "subidit/rover-resume",
    ref: "c0ed09e1c465",
    root: "templates/base rover",
    main: "base-rover.tex",
  },
  {
    id: "rover-office",
    name: "Rover Office",
    description: "A conservative, business-style variant of Rover for corporate and consulting roles.",
    category: "Business",
    tags: ["Product & business"],
    author: "Subidit",
    license: "CC-BY-4.0",
    url: gh("subidit/rover-resume"),
    repo: "subidit/rover-resume",
    ref: "c0ed09e1c465",
    root: "templates/office rover",
    main: "office-rover.tex",
  },
  {
    id: "resume-ng",
    skip: "Sample content is in Chinese.",
    name: "Resume NG",
    description: "Designed for maximum information density while staying elegant.",
    category: "Tech",
    tags: ["Software engineering"],
    author: "Feng Kaiyu",
    license: "LPPL-1.3c",
    url: gh("fky2015/resume-ng"),
    repo: "fky2015/resume-ng",
    ref: "8fb52d643421",
    main: "main.tex",
  },
  {
    id: "billryan-resume",
    skip: "Needs its bundled FontAwesome.otf. Retry when projects can include font files.",
    name: "Elegant Résumé (billryan)",
    description: "An elegant resume with icons; one of the most-starred LaTeX resumes (11k stars).",
    category: "Tech",
    tags: ["Most popular", "Software engineering"],
    author: "billryan",
    license: "MIT",
    url: gh("billryan/resume"),
    repo: "billryan/resume",
    ref: "eadc3955cf00",
    main: "resume.tex",
  },

  // ── Designed / two-column ───────────────────────────────────────────────────
  {
    id: "awesome-cv-resume",
    name: "Awesome CV (Resume)",
    description: "The most-starred LaTeX resume on GitHub (28k stars): bold headings, accent colour, modern type.",
    category: "Tech",
    tags: ["Most popular", "Software engineering", "Product & business", "Creative"],
    author: "Byungjin Park (posquit0)",
    license: "LPPL-1.3c",
    url: gh("posquit0/Awesome-CV"),
    repo: "posquit0/Awesome-CV",
    // The last commit before Font Awesome 6, which our TeX Live 2023 doesn't have yet.
    ref: "964f99d3",
    root: "examples",
    main: "resume.tex",
  },
  {
    id: "awesome-cv-cv",
    name: "Awesome CV (Long CV)",
    description: "The multi-page CV version of Awesome CV, with honours, committees, presentations and writing.",
    category: "Academic",
    tags: ["Academic & research", "Creative"],
    author: "Byungjin Park (posquit0)",
    license: "LPPL-1.3c",
    url: gh("posquit0/Awesome-CV"),
    repo: "posquit0/Awesome-CV",
    ref: "964f99d3",
    root: "examples",
    main: "cv.tex",
  },
  {
    id: "deedy-resume",
    skip: "Needs its bundled Lato/Raleway font files. Retry when projects can include font files.",
    name: "Deedy Resume",
    description: "The famous one-page, two-column resume used for tech internships and new-grad roles.",
    category: "Tech",
    tags: ["Most popular", "Two-column", "Software engineering", "Students & new grads"],
    author: "deedy",
    license: "Apache-2.0",
    url: gh("deedy/Deedy-Resume"),
    repo: "deedy/Deedy-Resume",
    ref: "6d06ba7d8eee",
    root: "OpenFonts",
    main: "deedy_resume-openfont.xtx",
  },
  {
    id: "altacv",
    name: "AltaCV",
    description: "A striking two-column CV with sidebar, icons and publications; popular in research and design.",
    category: "Creative",
    tags: ["Two-column", "Creative", "Academic & research"],
    author: "LianTze Lim",
    license: "LPPL-1.3c",
    url: gh("liantze/AltaCV"),
    repo: "liantze/AltaCV",
    ref: "91373530c558",
    main: "sample.tex",
    hasPhoto: true,
  },
  {
    id: "yaac",
    skip: "Needs xetex-inputenc.sty, which is not in TeX Live 2023.",
    name: "YAAC: Another Awesome CV",
    description: "A clean CV with Font Awesome icons and a strong headline.",
    category: "Creative",
    tags: ["Creative", "Product & business"],
    author: "Christophe Roger",
    license: "LPPL-1.3c",
    url: gh("darwiin/yaac-another-awesome-cv"),
    repo: "darwiin/yaac-another-awesome-cv",
    ref: "31dcdba2e0ea",
    root: "example",
    main: "cv.tex",
  },
  {
    id: "twenty-seconds-cv",
    skip: "Compiles, but the sidebar renders cut off with our engine/fonts.",
    name: "Twenty Seconds CV",
    description: "A sidebar CV designed to be read in twenty seconds, with skill bars and a photo.",
    category: "Creative",
    tags: ["Two-column", "Creative"],
    author: "Carmine Spagnuolo",
    license: "MIT",
    url: gh("spagnuolocarmine/TwentySecondsCurriculumVitae-LaTex"),
    repo: "spagnuolocarmine/TwentySecondsCurriculumVitae-LaTex",
    ref: "f7815bd4d39e",
    main: "Twenty-Seconds_cv.tex",
    hasPhoto: true,
  },
  {
    id: "plushcv",
    skip: "Needs its bundled Inter/Abril font files. Retry when projects can include font files.",
    name: "PlushCV",
    description: "A one-page, two-column resume with a soft modern look.",
    category: "Creative",
    tags: ["Two-column", "Creative", "Students & new grads"],
    author: "Shubham Mazumder",
    license: "Apache-2.0",
    url: gh("cystema/PlushCV"),
    repo: "cystema/PlushCV",
    ref: "d6883340d651",
    main: "PlushCV.tex",
  },
  {
    id: "latexcv-classic",
    name: "LaTeX CV: Classic",
    description: "A timeless single-column CV from the popular latexcv collection (3k stars).",
    category: "Business",
    tags: ["Product & business"],
    author: "Jan Küster (jankapunkt)",
    license: "MIT",
    url: gh("jankapunkt/latexcv"),
    repo: "jankapunkt/latexcv",
    ref: "1fc7a2033ddd",
    root: "classic",
    main: "main.tex",
  },
  {
    id: "latexcv-sidebar",
    name: "LaTeX CV: Sidebar",
    description: "A modern sidebar CV from the latexcv collection.",
    category: "Creative",
    tags: ["Two-column", "Creative"],
    author: "Jan Küster (jankapunkt)",
    license: "MIT",
    url: gh("jankapunkt/latexcv"),
    repo: "jankapunkt/latexcv",
    ref: "1fc7a2033ddd",
    root: "sidebar",
    main: "main.tex",
    hasPhoto: true,
  },
  {
    id: "latexcv-two-column",
    name: "LaTeX CV: Two Column",
    description: "A balanced two-column CV from the latexcv collection.",
    category: "Creative",
    tags: ["Two-column", "Creative"],
    author: "Jan Küster (jankapunkt)",
    license: "MIT",
    url: gh("jankapunkt/latexcv"),
    repo: "jankapunkt/latexcv",
    ref: "1fc7a2033ddd",
    root: "two_column",
    main: "main.tex",
    hasPhoto: true,
  },
  {
    id: "latexcv-rows",
    name: "LaTeX CV: Rows",
    description: "A row-based CV with a strong visual rhythm, from the latexcv collection.",
    category: "Creative",
    tags: ["Creative"],
    author: "Jan Küster (jankapunkt)",
    license: "MIT",
    url: gh("jankapunkt/latexcv"),
    repo: "jankapunkt/latexcv",
    ref: "1fc7a2033ddd",
    root: "rows",
    main: "main.tex",
    hasPhoto: true,
  },
  {
    id: "latexcv-infographics",
    name: "LaTeX CV: Infographics",
    description: "A visual CV with charts and timelines, from the latexcv collection.",
    category: "Creative",
    tags: ["Creative"],
    author: "Jan Küster (jankapunkt)",
    license: "MIT",
    url: gh("jankapunkt/latexcv"),
    repo: "jankapunkt/latexcv",
    ref: "1fc7a2033ddd",
    root: "infographics",
    main: "main.tex",
  },

  // ── Academic ────────────────────────────────────────────────────────────────
  {
    id: "moderncv-classic",
    skip: "v2.6.1 needs Font Awesome 6 (TeX Live 2024+); the example also needs styles newer than the moderncv in TeX Live 2023.",
    name: "moderncv",
    description: "The most widely used LaTeX CV class, standard in European and academic CVs.",
    category: "Academic",
    tags: ["Most popular", "Academic & research", "Product & business"],
    author: "Xavier Danaux, Rafal Kolodziej and contributors",
    license: "LPPL-1.3c",
    url: "https://ctan.org/pkg/moderncv",
    // The maintained version is on CTAN (the GitHub repo stopped in 2016). Its example document, v2.6.1.
    zipUrl: "https://mirrors.ctan.org/macros/latex/contrib/moderncv.zip",
    sha256: "9b50ba5c8e7de1c55e1252eaa0126f498fea2cd2d18236aab146f9f21d01ad59",
    root: "moderncv",
    main: "template.tex",
    // v2.6.1 needs Font Awesome 6 (TeX Live 2024+); use the moderncv in our TeX Live, as Overleaf does.
    useInstalled: ["moderncv"],
    hasPhoto: true,
  },
  {
    id: "rover-academic",
    name: "Rover Academic",
    description: "An academic CV for many publications, talks and grants.",
    category: "Academic",
    tags: ["Academic & research"],
    author: "Subidit",
    license: "CC-BY-4.0",
    url: gh("subidit/rover-resume"),
    repo: "subidit/rover-resume",
    ref: "c0ed09e1c465",
    root: "templates/academic rover",
    main: "acad-many.tex",
  },
];
