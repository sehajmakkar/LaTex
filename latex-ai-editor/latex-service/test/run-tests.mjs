// Integration tests for the compile service. Runs against a live instance:
//
//   SERVICE_URL=http://localhost:8080 LATEX_API_SECRET=... node test/run-tests.mjs
//
// SKIP_SLOW=1 skips the timeout and burst tests (use it against production).

const URL_BASE = (process.env.SERVICE_URL || "http://localhost:8080").replace(/\/$/, "");
const SECRET = process.env.LATEX_API_SECRET || "";
const SKIP_SLOW = process.env.SKIP_SLOW === "1";

let failures = 0;
let total = 0;

function record(name, ok, detail = "") {
  total++;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function compile(content, { engine, secret = SECRET } = {}) {
  const started = Date.now();
  const headers = { "Content-Type": "application/json" };
  if (secret !== null) headers["x-api-secret"] = secret;
  const res = await fetch(`${URL_BASE}/compile`, { method: "POST", headers, body: JSON.stringify({ content, engine }) });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, log: body.log || "", ms: Date.now() - started, retryAfter: res.headers.get("retry-after") };
}

const doc = (body, preamble = "") => `\\documentclass{article}\n${preamble}\n\\begin{document}\n${body}\n\\end{document}\n`;

/** Probes print RESULT:BLOCKED or RESULT:LEAKED into the TeX log. */
const probe = (log) => (log.includes("RESULT:LEAKED") ? "LEAKED" : log.includes("RESULT:BLOCKED") ? "BLOCKED" : "UNKNOWN");

function firstError(log) {
  const line = log.split("\n").find((l) => /^!|:\d+: /.test(l));
  return line ? `[${line.trim().slice(0, 150)}]` : "";
}

const detail = (r) => `${r.status} ${r.ms}ms${r.status === 200 ? "" : " " + firstError(r.log)}`;

async function run() {
  // ── Health, auth, input validation ─────────────────────────────────────────
  const health = await fetch(`${URL_BASE}/health`).then((r) => r.json());
  record("health", health.status === "ok", health.version);

  let r = await compile(doc("hi"), { secret: null });
  record("auth: missing secret → 401", r.status === 401, `got ${r.status}`);
  r = await compile(doc("hi"), { secret: "wrong" });
  record("auth: wrong secret → 401", r.status === 401, `got ${r.status}`);
  r = await compile("   ");
  record("empty document → 400", r.status === 400, `got ${r.status}`);

  // ── Engines and fonts ─────────────────────────────────────────────────────
  r = await compile(doc("Hello from pdf\\LaTeX."));
  record("pdflatex", r.status === 200 && r.body.engine === "pdflatex", detail(r));

  r = await compile(
    doc(
      "{\\setmainfont{TeX Gyre Pagella}Pagella café} {\\setmainfont{Liberation Sans}Liberation} {\\setmainfont{Carlito}Carlito} {\\setmainfont{Roboto}Roboto} {\\setmainfont{Source Sans Pro}Source Sans}",
      "\\usepackage{fontspec}"
    )
  );
  record("xelatex + fonts by name (TeX Live + system)", r.status === 200 && r.body.engine === "xelatex", detail(r));

  r = await compile(doc("\\directlua{tex.print('Lua says ' .. (6*7))} {\\setmainfont{Roboto}Roboto}", "\\usepackage{fontspec}"), { engine: "lualatex" });
  record("lualatex + fontspec", r.status === 200 && r.body.engine === "lualatex", detail(r));

  // ── Multi-pass: cross-references and biblatex/biber ───────────────────────
  r = await compile(
    doc(
      "See Section~\\ref{sec:a} on page~\\pageref{sec:a} and \\cite{knuth}.\n\\section{A}\\label{sec:a}\n\\printbibliography",
      "\\begin{filecontents*}[overwrite]{refs.bib}\n@book{knuth, author={Donald Knuth}, title={The TeXbook}, year={1984}, publisher={Addison-Wesley}}\n\\end{filecontents*}\n\\usepackage[backend=biber]{biblatex}\n\\addbibresource{refs.bib}"
    )
  );
  const unresolved = /undefined references|Citation .* undefined|Rerun to get/i.test(r.log);
  record("latexmk: \\ref + biblatex/biber resolved", r.status === 200 && !unresolved, `${detail(r)} unresolved=${unresolved}`);

  // ── Overleaf-style package and class coverage ─────────────────────────────
  r = await compile(
    doc(
      "\\faGithub\\ \\faLinkedin\\ \\SI{3.5}{\\giga\\hertz}\n" +
        "\\begin{tikzpicture}\\draw (0,0) circle (1);\\end{tikzpicture}\n" +
        "\\begin{tikzpicture}\\begin{axis}\\addplot {x^2};\\end{axis}\\end{tikzpicture}\n" +
        "\\begin{tcolorbox}Box\\end{tcolorbox}\n" +
        "\\begin{tabularx}{\\linewidth}{lX}\\toprule a & b\\\\\\bottomrule\\end{tabularx}",
      "\\usepackage[margin=1in]{geometry}\\usepackage{tikz,pgfplots,fontawesome5,tcolorbox,siunitx,booktabs,tabularx,xcolor,enumitem,titlesec,microtype,csquotes,listings,amsmath,amssymb,mathtools,multicol,paracol,graphicx,fancyhdr,longtable,float,caption,subcaption,hyperref,cleveref}\\usepackage[english]{babel}\\pgfplotsset{compat=newest}"
    )
  );
  record("packages: tikz, pgfplots, fontawesome5, tcolorbox, siunitx, …", r.status === 200, detail(r));

  r = await compile(
    "\\documentclass[11pt,a4paper,sans]{moderncv}\n\\moderncvstyle{classic}\\moderncvcolor{blue}\n\\name{Jane}{Doe}\n\\begin{document}\\makecvtitle\\section{Experience}\\cventry{2020--2024}{Engineer}{Acme}{}{}{Built things.}\\end{document}\n"
  );
  record("class: moderncv", r.status === 200, detail(r));

  // ── Security: file access, shell escape, secret ────────────────────────────
  r = await compile(doc("\\input{/proc/self/environ}"));
  record("security: \\input{/proc/self/environ} fails", r.status === 422 && !(SECRET && r.log.includes(SECRET)), `${r.status}`);

  for (const target of ["/etc/passwd", "/proc/1/environ", "/proc/self/environ", "../../../etc/passwd", "/run/latex-secret/secret"]) {
    r = await compile(doc(`\\IfFileExists{${target}}{\\typeout{RESULT:LEAKED}}{\\typeout{RESULT:BLOCKED}}ok`));
    record(`security: TeX read ${target}`, probe(r.log) === "BLOCKED", `${r.status} ${probe(r.log)}`);
  }

  r = await compile(
    doc("\\immediate\\write18{touch pwned.txt}\\IfFileExists{pwned.txt}{\\typeout{RESULT:LEAKED}}{\\ifnum\\pdfshellescape>0 \\typeout{RESULT:LEAKED}\\else\\typeout{RESULT:BLOCKED}\\fi}ok")
  );
  record("security: shell escape (\\write18) disabled", probe(r.log) === "BLOCKED", `${r.status} ${probe(r.log)}`);

  r = await compile(
    doc("\\newwrite\\f\\immediate\\openout\\f=/tmp/owned.tex\\immediate\\write\\f{x}\\immediate\\closeout\\f\\IfFileExists{owned.tex}{\\typeout{RESULT:LEAKED}}{\\typeout{RESULT:BLOCKED}}ok")
  );
  const refusedWrite = r.status === 422 || /openout_any|not writ|can't write/i.test(r.log);
  record("security: TeX write to /tmp refused", refusedWrite, `${r.status}`);

  // Lua's io library isn't covered by openin_any/openout_any, so these rely on
  // each compile running as its own user with nowhere writable but its folder.
  const luaProbes = {
    "read the service code (/app/server.js)": "io.open('/app/server.js','r')",
    "read /proc/1/environ": "io.open('/proc/1/environ','r')",
    "write /tmp": "io.open('/tmp/luaowned','w')",
    "write /var/tmp": "io.open('/var/tmp/luaowned','w')",
    "write /dev/shm": "io.open('/dev/shm/luaowned','w')",
    "io.popen('id')": "io.popen('id')",
    "os.execute('true')": "os.execute('true')",
    "os.getenv('LATEX_API_SECRET')": "os.getenv('LATEX_API_SECRET')",
  };
  for (const [label, expr] of Object.entries(luaProbes)) {
    const code = `local ok, v = pcall(function() return ${expr} end) texio.write_nl('RESULT:' .. ((ok and v) and 'LEAKED' or 'BLOCKED'))`;
    r = await compile(doc(`\\directlua{${code}}ok`), { engine: "lualatex" });
    record(`security: Lua ${label}`, probe(r.log) === "BLOCKED", `${r.status} ${probe(r.log)}`);
  }

  // Scan every process not owned by this compile's user: none may expose its
  // environment or memory (the server holds the secret in both). The probe is
  // a .lua file so TeX doesn't reinterpret %, ~, # in the Lua code.
  const scan = `local function uid(pid)
  local f = io.open("/proc/" .. pid .. "/status", "r")
  if not f then return nil end
  local s = f:read("*a") f:close()
  return s:match("Uid:%s+(%d+)")
end
local me, leak = uid("self"), "BLOCKED"
for pid = 1, 1000 do
  local owner = uid(pid)
  if owner and owner ~= me then
    if io.open("/proc/" .. pid .. "/environ", "r") or io.open("/proc/" .. pid .. "/mem", "r") then leak = "LEAKED" end
  end
end
texio.write_nl("RESULT:" .. leak)`;
  r = await compile(
    `\\begin{filecontents*}[overwrite]{probe.lua}\n${scan}\n\\end{filecontents*}\n` + doc("\\directlua{dofile('probe.lua')}ok"),
    { engine: "lualatex" }
  );
  record("security: Lua can't open other processes' environ/mem", probe(r.log) === "BLOCKED", `${r.status} ${probe(r.log)}`);

  // ── Limits ─────────────────────────────────────────────────────────────────
  r = await compile(
    doc(
      "\\newwrite\\f\\immediate\\openout\\f=big.txt\\count255=0 \\loop\\immediate\\write\\f{" +
        "x".repeat(1000) +
        "}\\advance\\count255 by 1 \\ifnum\\count255<200000 \\repeat\\immediate\\closeout\\f ok"
    )
  );
  record("limit: writing a 200 MB file is stopped", r.status === 422 && r.body.reason === "limit", `${r.status} ${r.ms}ms reason=${r.body.reason}`);

  if (!SKIP_SLOW) {
    r = await compile(doc("\\loop\\iftrue\\repeat"));
    record("limit: infinite loop killed at the timeout", r.status === 422 && r.body.reason === "timeout", `${r.status} ${r.ms}ms reason=${r.body.reason}`);

    // More requests than (concurrency + queue) at once: only clean 200s and 503s.
    const slow = doc("\\count255=0 \\loop\\advance\\count255 by 1 \\ifnum\\count255<20000000 \\repeat done");
    const burst = await Promise.all(Array.from({ length: 10 }, () => compile(slow)));
    const codes = burst.map((b) => b.status);
    const busy = burst.filter((b) => b.status === 503);
    record(
      "limit: burst of 10 → only 200/503 (503s carry Retry-After)",
      codes.every((c) => c === 200 || c === 503) && busy.length > 0 && busy.every((b) => b.retryAfter),
      `200×${codes.filter((c) => c === 200).length} 503×${busy.length} other=${codes.filter((c) => c !== 200 && c !== 503).join(",") || "none"}`
    );
    const after = await fetch(`${URL_BASE}/health`).then((x) => x.json());
    record("health after burst (nothing stuck)", after.status === "ok" && after.active === 0 && after.queued === 0, `active=${after.active} queued=${after.queued}`);
  }

  console.log(`\n${total - failures}/${total} passed`);
  process.exit(failures ? 1 : 0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
