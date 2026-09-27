import JSZip from "jszip";
import { MAX_CONTENT_SIZE } from "@/lib/constants";

/**
 * Imports an existing LaTeX resume (a .tex file or an Overleaf project .zip)
 * as-is, so it keeps its exact design. Vero compiles a single main.tex, so:
 *  - \input / \include of other .tex files are inlined;
 *  - custom .cls / .sty / .bib files are embedded with `filecontents*`, which
 *    writes them next to main.tex at compile time (paths flattened to names);
 *  - images can't be carried over yet, so \includegraphics is removed and reported.
 */

export type LatexImport = {
  content: string;
  mainFile: string;
  /** Support files written into the document with filecontents*. */
  embedded: string[];
  warnings: string[];
};

export class LatexImportError extends Error {}

const SUPPORT_EXT = /\.(cls|sty|bib|bst|def|cfg|clo)$/i;
const IMAGE_EXT = /\.(png|jpe?g|pdf|eps|svg|gif)$/i;
const FONT_EXT = /\.(ttf|otf|pfb|woff2?)$/i;
/**
 * Makes \includegraphics draw an empty box: imported projects have no image
 * files yet. (Checking whether a file exists isn't enough: `{qrcode}` would
 * find TeX Live's unrelated qrcode package.) TeX Live's example-image files
 * still work.
 */
const IMAGE_FALLBACK = String.raw`% Vero: images from the original project aren't available yet, so they show as empty boxes.
\makeatletter
\AtBeginDocument{%
  \ifdefined\includegraphics
    \let\veroIncludegraphics\includegraphics
    \renewcommand{\includegraphics}[2][]{%
      \in@{example-image}{#2}%
      \ifin@\veroIncludegraphics[#1]{#2}\else\fbox{\rule{0pt}{1.2cm}\rule{1.2cm}{0pt}}\fi}%
  \fi}
\makeatother
`;

/** \input files that come with TeX Live rather than the project. */
const TEXLIVE_INPUTS = new Set(["glyphtounicode", "glyphtounicode-cmr", "pdfglyphlist"]);
const MAX_ENTRIES = 300;
const MAX_TEXT_FILE = 1024 * 1024;
const MAX_TOTAL = 8 * 1024 * 1024;

const basename = (p: string) => p.split("/").pop() ?? p;
const dirname = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
const stripExt = (p: string) => p.replace(/\.[^./]+$/, "");

function normalizePath(p: string): string {
  const out: string[] = [];
  for (const part of p.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/** The code part of a line (before an unescaped %). */
function splitComment(line: string): [string, string] {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "%" && (i === 0 || line[i - 1] !== "\\")) return [line.slice(0, i), line.slice(i)];
  }
  return [line, ""];
}

function mapCode(text: string, fn: (code: string) => string): string {
  return text
    .split("\n")
    .map((line) => {
      const [code, comment] = splitComment(line);
      return fn(code) + comment;
    })
    .join("\n");
}

const isMainCandidate = (text: string) =>
  /^[^%\n]*\\documentclass/m.test(text) && /^[^%\n]*\\begin\s*\{document\}/m.test(text);

/** Picks the main .tex file: one with \documentclass and \begin{document}, preferring common names and shallow paths. */
export function pickMain(texFiles: Map<string, string>): string | null {
  const candidates = [...texFiles.entries()].filter(([, text]) => isMainCandidate(text)).map(([path]) => path);
  if (!candidates.length) return null;
  const rank = (p: string) => {
    const name = basename(p).toLowerCase();
    const preferred = ["main.tex", "resume.tex", "cv.tex"].indexOf(name);
    return (preferred === -1 ? 3 : preferred) * 10 + p.split("/").length;
  };
  return candidates.sort((a, b) => rank(a) - rank(b) || (texFiles.get(b)!.length - texFiles.get(a)!.length))[0];
}

/**
 * Builds a single compilable document from project files (paths → text).
 * `binaryNames` lists images/fonts that were in the project but can't be used.
 */
export type ProjectOptions = {
  /** Only use files under this folder (e.g. one template in a multi-template repo). */
  root?: string;
  /** The main .tex file (relative to `root`), instead of guessing. */
  main?: string;
  /** Use the TeX Live copy of these class/style files instead of embedding the project's (e.g. ["moderncv"]). */
  useInstalled?: string[];
};

export function buildFromProject(texts: Map<string, string>, binaryNames: string[] = [], options: ProjectOptions = {}): LatexImport {
  const texFiles = new Map([...texts].filter(([p]) => /\.(tex|ltx|xtx)$/i.test(p)));
  const mainFile = options.main && texFiles.has(normalizePath(options.main)) ? normalizePath(options.main) : pickMain(texFiles);
  if (!mainFile) {
    throw new LatexImportError(
      "Couldn't find the main .tex file (one with \\documentclass and \\begin{document}). If your resume uses several files, upload the whole Overleaf project as a .zip."
    );
  }
  const warnings: string[] = [];
  const missingInputs = new Set<string>();

  const resolve = (name: string, fromDir: string): string | null => {
    const clean = name.trim().replace(/^"(.*)"$/, "$1");
    const tries = [clean, `${clean}.tex`].flatMap((n) => [normalizePath(`${fromDir}/${n}`), normalizePath(n)]);
    return tries.find((t) => texFiles.has(t)) ?? null;
  };

  // Support files: embed by file name; references with folders become plain names.
  const support = [...texts.keys()].filter((p) => SUPPORT_EXT.test(p));
  const byName = new Map<string, string>();
  for (const p of support) {
    const name = basename(p);
    if (options.useInstalled?.some((stem) => name.startsWith(stem))) continue;
    if (byName.has(name)) warnings.push(`Two files are named ${name}; used ${byName.get(name)}.`);
    else byName.set(name, p);
  }
  const flatten = (path: string, depth: number, stack: string[]): string => {
    const dir = dirname(path);
    return mapCode(texFiles.get(path) ?? "", (code) =>
      code.replace(/\\(input|include|subfile)\s*\{([^{}]+)\}/g, (match, _cmd: string, name: string) => {
        const target = resolve(name, dir) ?? resolve(name, dirname(mainFile));
        if (!target) {
          // Support files (e.g. \input{pubs.cfg}) are embedded next to main.tex under their own name.
          const embeddedName = basename(name.trim());
          if (byName.has(embeddedName)) return match.replace(name, embeddedName);
          // Files from TeX Live (e.g. glyphtounicode) are fine; project files that are missing are not.
          const bare = name.trim();
          if (/[/.]/.test(bare) || (texts.size > 1 && !TEXLIVE_INPUTS.has(bare))) missingInputs.add(bare);
          return match;
        }
        if (stack.includes(target) || depth > 10) return "";
        return `\n%%%% ---- ${target} ----\n${flatten(target, depth + 1, [...stack, target])}\n%%%% ---- end ${target} ----\n`;
      })
    );
  };
  let doc = flatten(mainFile, 0, [mainFile]);

  const supportStems = new Set([...byName.keys()].map(stripExt));
  const flattenRefs = (text: string) =>
    mapCode(text, (code) =>
      code.replace(
        /(\\(?:documentclass|LoadClass|usepackage|RequirePackage|bibliography|bibliographystyle|addbibresource)\s*(?:\[[^\]]*\])?\s*\{)([^{}]+)(\})/g,
        (_m, open: string, list: string, close: string) =>
          open +
          list
            .split(",")
            .map((item) => {
              const stem = stripExt(basename(item.trim()));
              return item.includes("/") && supportStems.has(stem) ? basename(item.trim()) : item;
            })
            .join(",") +
          close
      )
    );
  doc = flattenRefs(doc);

  // Images can't be carried over yet. Rather than deleting \includegraphics (which
  // class macros such as AltaCV's \photo call internally), any image that isn't
  // there is drawn as an empty box, so the layout survives.
  // Uses in the document and in the class/style files it embeds (e.g. a \photo macro).
  const imageSources = [doc, ...[...byName.values()].map((p) => texts.get(p) ?? "")].join("\n");
  const imageRefs =
    (imageSources.match(/\\includegraphics/g) ?? []).length + (doc.match(/\\photo[LR]?\s*(\[[^\]]*\])?\s*\{/g) ?? []).length;
  const beginDoc = doc.search(/^[^%\n]*\\begin\s*\{document\}/m);
  if (imageRefs && beginDoc !== -1) doc = doc.slice(0, beginDoc) + IMAGE_FALLBACK + doc.slice(beginDoc);
  if (imageRefs) {
    warnings.push("Images (like a photo or logo) can't be imported yet, so they show as empty boxes. Remove them or keep the box as a placeholder.");
  }
  const fonts = binaryNames.filter((n) => FONT_EXT.test(n));
  if (fonts.length) warnings.push(`Custom font files (${fonts.slice(0, 3).map(basename).join(", ")}) can't be used; the compiler falls back to installed fonts.`);
  if (missingInputs.size) {
    warnings.push(
      `These files are used but weren't uploaded: ${[...missingInputs].slice(0, 5).join(", ")}. Upload the whole Overleaf project as a .zip (Menu → Download → Source).`
    );
  }

  const embedded = [...byName.entries()].filter(([, p]) => (texts.get(p) ?? "").length > 0);
  const blocks = embedded.map(
    ([name, p]) => `\\begin{filecontents*}[overwrite]{${name}}\n${flattenRefs(texts.get(p)!.replace(/\n?$/, "\n"))}\\end{filecontents*}`
  );
  const header = [`% Imported into Vero from ${mainFile}.`];
  if (blocks.length) header.push("% Your project's own class/style files are included below so it compiles as one file.");
  const content = [...header, ...blocks, doc.replace(/^﻿/, "")].join("\n");
  if (content.length > MAX_CONTENT_SIZE) {
    throw new LatexImportError(`The project is too large to import (${Math.round(content.length / 1024)} KB of LaTeX; the limit is ${MAX_CONTENT_SIZE / 1000} KB).`);
  }
  return { content, mainFile, embedded: embedded.map(([n]) => n), warnings };
}

function decode(buffer: Buffer | Uint8Array): string {
  return new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

export function importTexFile(buffer: Buffer, fileName = "main.tex"): LatexImport {
  const text = decode(buffer);
  if (text.includes("\u0000")) throw new LatexImportError("That file isn't a text .tex file.");
  return buildFromProject(new Map([[fileName.replace(/[^\w.\- ]/g, "_") || "main.tex", text]]));
}

export async function importZip(buffer: Buffer, options: ProjectOptions = {}): Promise<LatexImport> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new LatexImportError("That file isn't a valid .zip.");
  }
  const entries = Object.values(zip.files).filter(
    (f) => !f.dir && !f.name.startsWith("__MACOSX/") && !basename(f.name).startsWith(".")
  );
  if (entries.length > MAX_ENTRIES) throw new LatexImportError(`The .zip has too many files (${entries.length}; the limit is ${MAX_ENTRIES}).`);

  const texts = new Map<string, string>();
  const binaries: string[] = [];
  const symlinks = new Map<string, string>();
  let total = 0;
  for (const entry of entries) {
    const path = normalizePath(entry.name);
    // Repos (e.g. GitHub downloads) can contain symlinks, stored as a file holding the target path.
    const mode = typeof entry.unixPermissions === "number" ? entry.unixPermissions : 0;
    if ((mode & 0o170000) === 0o120000) {
      symlinks.set(path, normalizePath(`${dirname(path)}/${(await entry.async("string")).trim()}`));
      continue;
    }
    if (/\.(tex|ltx|xtx)$/i.test(path) || SUPPORT_EXT.test(path)) {
      // Check the declared size before inflating, so a zip bomb is refused cheaply.
      const declared = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
      if (declared > MAX_TEXT_FILE) throw new LatexImportError(`${path} is too large to import.`);
      const data = await entry.async("uint8array");
      total += data.length;
      if (data.length > MAX_TEXT_FILE || total > MAX_TOTAL) throw new LatexImportError("The project is too large to import.");
      texts.set(path, decode(data));
    } else if (IMAGE_EXT.test(path) || FONT_EXT.test(path)) {
      binaries.push(path);
    }
  }
  for (const [link, target] of symlinks) {
    if (texts.has(target)) texts.set(link, texts.get(target)!);
    else if (binaries.includes(target)) binaries.push(link);
  }
  // Overleaf zips often have everything inside one top folder; that's handled by relative paths.
  // Scope to `root` when given (paths become relative to it). A zip from GitHub wraps
  // everything in one "repo-sha/" folder, so `root` is matched below that too.
  if (options.root) {
    const root = normalizePath(options.root);
    const top = [...texts.keys()][0]?.split("/")[0];
    const prefixes = [`${root}/`, top ? `${top}/${root}/` : null].filter((x): x is string => !!x);
    const scope = <T,>(entries: [string, T][]) =>
      entries.flatMap(([p, v]) => {
        const prefix = prefixes.find((x) => p.startsWith(x));
        return prefix ? [[p.slice(prefix.length), v] as [string, T]] : [];
      });
    const scoped = new Map(scope([...texts.entries()]));
    if (!scoped.size) throw new LatexImportError(`No files under ${root}/ in this zip.`);
    return buildFromProject(scoped, scope(binaries.map((b) => [b, b] as [string, string])).map(([p]) => p), options);
  }
  if (options.main) {
    // A GitHub zip's top folder: make `main` relative to it.
    const top = [...texts.keys()][0]?.split("/")[0];
    if (top && [...texts.keys()].every((p) => p.startsWith(`${top}/`))) {
      return buildFromProject(new Map([...texts].map(([p, v]) => [p.slice(top.length + 1), v])), binaries, options);
    }
  }
  return buildFromProject(texts, binaries, options);
}
