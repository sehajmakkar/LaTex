/**
 * Builds the template catalog from scripts/templates/sources.ts:
 *   download the pinned zip → import it exactly like a user's Overleaf .zip →
 *   add a credit header → compile on the compile service (engine probe) →
 *   render a preview → write src/templates/catalog/.
 * Templates that don't compile are reported and left out.
 *
 *   npx tsx --env-file=.env --tsconfig tsconfig.json scripts/import-templates.ts [--only id,id] [--no-previews]
 *
 * Previews use macOS `sips` (PDF → PNG) and sharp (→ WebP).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import type { TemplateManifest } from "@/types";
import sharp from "sharp";
import { importZip } from "@/services/import/latex-import";
import { compileSmart } from "@/services/compile/smart-compile";
import type { LatexEngine } from "@/lib/latex-engine";
import { TEMPLATE_SOURCES, type TemplateSource } from "./templates/sources";

const ROOT = join(__dirname, "..");
const CACHE = join(ROOT, ".template-cache");
const OUT = join(ROOT, "src/templates/catalog");
const PREVIEWS = join(ROOT, "public/templates/catalog");

const LICENSE_URL: Record<TemplateSource["license"], string> = {
  MIT: "https://opensource.org/license/mit",
  "Apache-2.0": "https://www.apache.org/licenses/LICENSE-2.0",
  "LPPL-1.3c": "https://www.latex-project.org/lppl/lppl-1-3c/",
  "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
};

async function download(src: TemplateSource): Promise<Buffer> {
  if (src.zip) return readFileSync(join(ROOT, src.zip));
  if (src.zipUrl) {
    mkdirSync(CACHE, { recursive: true });
    const file = join(CACHE, `${src.id}-${src.sha256?.slice(0, 12)}.zip`);
    if (!existsSync(file)) {
      const res = await fetch(src.zipUrl);
      if (!res.ok) throw new Error(`download failed (${res.status})`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
    const buffer = readFileSync(file);
    const actual = createHash("sha256").update(buffer).digest("hex");
    if (src.sha256 && actual !== src.sha256) {
      rmSync(file);
      throw new Error(`checksum changed (the source was updated upstream: new sha256 ${actual}); review it and update the pin`);
    }
    return buffer;
  }
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${src.repo!.replace("/", "__")}@${src.ref}.zip`);
  if (!existsSync(file)) {
    const res = await fetch(`https://codeload.github.com/${src.repo}/zip/${src.ref}`);
    if (!res.ok) throw new Error(`download failed (${res.status})`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFileSync(file);
}

/** The repository's own LICENSE text (MIT asks for it to travel with every copy). */
async function licenseText(zipBuffer: Buffer): Promise<string | null> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const entry = Object.values(zip.files).find((f) => !f.dir && /^([^/]+\/)?(LICEN[SC]E)(\.(md|txt))?$/i.test(f.name));
  return entry ? (await entry.async("string")).trim() : null;
}

function creditHeader(src: TemplateSource, license: string | null): string {
  const lines = [
    `"${src.name}" by ${src.author}: ${src.url}`,
    `License: ${src.license} (${LICENSE_URL[src.license]}). Imported unchanged into Vero${src.ref ? ` from commit ${src.ref}` : ""}.`,
    "Replace the sample content with your own; keep this notice.",
  ];
  if (src.license === "MIT" && license) lines.push("", ...license.split("\n"));
  return `${lines.map((l) => (l ? `% ${l}` : "%")).join("\n")}\n%\n`;
}

async function preview(id: string, pdf: Buffer) {
  mkdirSync(PREVIEWS, { recursive: true });
  const tmpPdf = join(CACHE, `${id}.pdf`);
  const tmpPng = join(CACHE, `${id}.png`);
  writeFileSync(tmpPdf, pdf);
  // sips renders the first page.
  execFileSync("sips", ["-s", "format", "png", "-Z", "1400", tmpPdf, "--out", tmpPng], { stdio: "ignore" });
  await sharp(tmpPng).resize({ width: 800 }).flatten({ background: "#ffffff" }).webp({ quality: 82 }).toFile(join(PREVIEWS, `${id}.webp`));
  rmSync(tmpPdf);
  rmSync(tmpPng);
}

async function main() {
  const only = process.argv.find((a) => a.startsWith("--only"))?.split("=")[1]?.split(",") ?? process.argv[process.argv.indexOf("--only") + 1]?.split(",");
  const onlyIds = process.argv.includes("--only") || process.argv.some((a) => a.startsWith("--only=")) ? only : null;
  const withPreviews = !process.argv.includes("--no-previews");
  const sources = TEMPLATE_SOURCES.filter((s) => !s.skip && (!onlyIds || onlyIds.includes(s.id)));
  for (const s of TEMPLATE_SOURCES.filter((x) => x.skip)) {
    rmSync(join(OUT, `${s.id}.ts`), { force: true });
    rmSync(join(PREVIEWS, `${s.id}.webp`), { force: true });
    console.log(`SKIP ${s.id.padEnd(22)} ${s.skip}`);
  }
  mkdirSync(OUT, { recursive: true });

  const results: { src: TemplateSource; ok: boolean; engine?: LatexEngine; kb?: number; warnings: string[]; error?: string }[] = [];
  for (const src of sources) {
    try {
      const zip = await download(src);
      const imported = await importZip(zip, { root: src.root, main: src.main, useInstalled: src.useInstalled });
      const content = creditHeader(src, await licenseText(zip)) + imported.content;
      const compiled = await compileSmart(content);
      // Catalog templates must compile cleanly (no errors), not just produce a PDF.
      if (compiled.ok && compiled.errors.length) {
        const firstError = compiled.errors[0].message;
        results.push({ src, ok: false, warnings: imported.warnings, error: `compiles with ${compiled.errors.length} error(s): ${firstError}`.slice(0, 160) });
        console.log(`FAIL ${src.id.padEnd(22)} compiles with ${compiled.errors.length} error(s): ${firstError.slice(0, 100)}`);
        continue;
      }
      if (!compiled.ok) {
        const firstError = (compiled.log ?? compiled.message).split("\n").find((l) => /^!|:\d+: /.test(l)) ?? compiled.message;
        results.push({ src, ok: false, warnings: imported.warnings, error: firstError.slice(0, 160) });
        console.log(`FAIL ${src.id.padEnd(22)} ${firstError.slice(0, 140)}`);
        continue;
      }
      writeFileSync(
        join(OUT, `${src.id}.ts`),
        `// Generated by scripts/import-templates.ts from ${src.url}. Don't edit.\nexport const content = ${JSON.stringify(content)};\nexport const engine = ${JSON.stringify(compiled.engine)};\n`
      );
      if (withPreviews) await preview(src.id, compiled.pdf);
      results.push({ src, ok: true, engine: compiled.engine, kb: Math.round(content.length / 1024), warnings: imported.warnings });
      console.log(`OK   ${src.id.padEnd(22)} ${compiled.engine.padEnd(9)} ${Math.round(content.length / 1024)} KB${imported.warnings.length ? `  (${imported.warnings.length} warning)` : ""}`);
    } catch (e) {
      results.push({ src, ok: false, warnings: [], error: e instanceof Error ? e.message : String(e) });
      console.log(`FAIL ${src.id.padEnd(22)} ${e instanceof Error ? e.message : e}`);
    }
  }

  // The index lists every template whose module exists (so --only runs keep earlier ones).
  const included = TEMPLATE_SOURCES.filter((s) => !s.skip && existsSync(join(OUT, `${s.id}.ts`)));
  const failed = new Set(results.filter((r) => !r.ok).map((r) => r.src.id));
  const kept = included.filter((s) => !failed.has(s.id));
  for (const s of included.filter((x) => failed.has(x.id))) rmSync(join(OUT, `${s.id}.ts`));
  const varName = (id: string) => id.replace(/-(\w)/g, (_m, c: string) => c.toUpperCase());
  const index = [
    "// Generated by scripts/import-templates.ts. Don't edit; change scripts/templates/sources.ts and re-run.",
    'import type { TemplateManifest } from "@/types";',
    ...kept.map((s) => `import { content as ${varName(s.id)} } from "./${s.id}";`),
    "",
    "export const CATALOG: { manifest: TemplateManifest; content: string }[] = [",
    ...kept.map((s) => {
      const manifest: TemplateManifest = {
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        tags: [...s.tags],
        variables: [],
        preview: `/templates/catalog/${s.id}.webp`,
        source: { author: s.author, url: s.url, license: s.license },
        hasPhoto: s.hasPhoto ?? false,
        engine: (readFileSync(join(OUT, `${s.id}.ts`), "utf8").match(/export const engine = "(\w+)"/)?.[1] ?? "pdflatex") as LatexEngine,
      };
      return `  { manifest: ${JSON.stringify(manifest)}, content: ${varName(s.id)} },`;
    }),
    "];",
    "",
  ].join("\n");
  writeFileSync(join(OUT, "index.ts"), index);

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${ok}/${results.length} imported. Catalog now has ${kept.length} templates.`);
  for (const r of results.filter((x) => x.warnings.length)) console.log(`  ${r.src.id}: ${r.warnings.join(" | ")}`);
}

main();
