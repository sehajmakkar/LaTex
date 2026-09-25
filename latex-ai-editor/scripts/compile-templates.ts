/**
 * Compiles the default resume and every registered template against a LaTeX
 * compile service. Exits non-zero if any fails, so CI blocks a template that
 * needs a package the service image doesn't have.
 *
 *   LATEX_SERVICE_URL=http://localhost:8080 LATEX_API_SECRET=... npm run test:templates
 */
import { getTemplateManifests, getTemplateById, substituteVariables } from "@/templates";
import { detectEngine } from "@/lib/latex-engine";
import { DEFAULT_LATEX_CONTENT } from "@/lib/constants";

const url = process.env.LATEX_SERVICE_URL?.replace(/\/$/, "");
const secret = process.env.LATEX_API_SECRET;
if (!url || !secret) {
  console.error("Set LATEX_SERVICE_URL and LATEX_API_SECRET.");
  process.exit(1);
}

type ServiceResponse = { ok?: boolean; engine?: string; log?: string; pdf?: string };

async function compile(name: string, content: string): Promise<boolean> {
  const started = Date.now();
  const res = await fetch(`${url}/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-secret": secret! },
    body: JSON.stringify({ content, engine: detectEngine(content) }),
  });
  const body = (await res.json().catch(() => ({}))) as ServiceResponse;
  const ok = res.status === 200 && body.ok === true;
  const error = ok ? "" : (body.log ?? "").split("\n").find((l) => /^!|:\d+: /.test(l)) ?? `HTTP ${res.status}`;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(22)} ${String(body.engine).padEnd(9)} ${Date.now() - started}ms ${error}`);
  return ok;
}

async function main() {
  const results = [await compile("default-resume", DEFAULT_LATEX_CONTENT)];
  for (const manifest of getTemplateManifests()) {
    const template = getTemplateById(manifest.id)!;
    const sample = Object.fromEntries(template.variables.map((v) => [v.key, v.placeholder || "Sample"]));
    results.push(await compile(manifest.id, substituteVariables(template.content, sample)));
  }
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} compiled`);
  process.exit(failed ? 1 : 0);
}

main();
