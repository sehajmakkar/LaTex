"use strict";

const express = require("express");
const { spawn, execFileSync } = require("child_process");
const { mkdtemp, writeFile, readFile, readdir, rm, stat, chown, chmod } = require("fs/promises");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { detectEngine } = require("./engine-detect");

// ── Config ───────────────────────────────────────────────────────────────────
// Defaults fit Railway Free (0.5 GB RAM, 1 vCPU): lualatex alone can use
// 300–500 MB, so only one compile runs at a time. Raise on bigger plans.
const int = (name, fallback) => {
  const n = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const PORT = int("PORT", 8080);
const COMPILE_TIMEOUT_MS = int("COMPILE_TIMEOUT_MS", 60_000);
/** Each concurrent slot compiles as its own user (texjob0…7, see Dockerfile). */
const TEX_UID_BASE = 20000;
const TEX_USERS = 8;
const MAX_CONCURRENT = Math.min(int("MAX_CONCURRENT_COMPILES", 1), TEX_USERS);
const MAX_QUEUE = int("MAX_QUEUED_COMPILES", 4);
const QUEUE_TIMEOUT_MS = int("QUEUE_TIMEOUT_MS", 30_000);
const MAX_LOG_BYTES = 200_000;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
/** Largest file a compile may write, in KiB (ulimit -f). */
const MAX_FILE_KB = 50 * 1024;
const WORK_ROOT = process.env.WORK_ROOT || "/var/lib/vero-jobs";
/** In Docker we run as root and drop each compile to a texjob user; locally we can't. */
const RUN_AS_TEX_USERS = typeof process.getuid === "function" && process.getuid() === 0;

const ENGINE_FLAGS = {
  pdflatex: "-pdf",
  xelatex: "-xelatex",
  lualatex: "-lualatex",
};

// ── Secret ───────────────────────────────────────────────────────────────────
// Compiles run as separate users, so TeX can't read this process's environment
// or memory. The secret is also removed from process.env so it can never be
// passed on by accident.
const API_SECRET = (process.env.LATEX_API_SECRET || "").trim();
delete process.env.LATEX_API_SECRET;
if (!API_SECRET) {
  console.error("LATEX_API_SECRET is not set. Refusing to start an open compile service.");
  process.exit(1);
}
const SECRET_DIGEST = crypto.createHash("sha256").update(API_SECRET).digest();

/** Constant-time check: hashing first makes both sides the same length. */
function isAuthorized(header) {
  if (typeof header !== "string" || header.length === 0) return false;
  const given = crypto.createHash("sha256").update(header).digest();
  return crypto.timingSafeEqual(given, SECRET_DIGEST);
}

// ── TeX sandbox ──────────────────────────────────────────────────────────────
// kpathsea reads these texmf.cnf settings from the environment:
//   shell_escape=f → \write18 and Lua os.execute/io.popen are disabled
//   openin_any=p   → reading absolute paths, "..", or dotfiles is refused
//   openout_any=p  → the same for writing
// Only this allow-list is passed, so nothing else from our env reaches TeX.
function texEnv(workDir) {
  return {
    PATH: process.env.PATH,
    LANG: "C.UTF-8",
    HOME: workDir,
    TMPDIR: workDir,
    TEXMFVAR: path.join(workDir, ".texmf-var"),
    TEXMFCONFIG: path.join(workDir, ".texmf-config"),
    shell_escape: "f",
    openin_any: "p",
    openout_any: "p",
  };
}

const TEX_VERSION = (() => {
  try {
    return execFileSync("pdftex", ["--version"], { encoding: "utf8" }).split("\n")[0];
  } catch {
    return "unknown";
  }
})();

// ── Concurrency queue ────────────────────────────────────────────────────────
const freeSlots = Array.from({ length: MAX_CONCURRENT }, (_, i) => i);
const waiting = [];
const activeCount = () => MAX_CONCURRENT - freeSlots.length;

/** Resolves with a free slot number; rejects with QUEUE_FULL / QUEUE_TIMEOUT. */
function acquireSlot() {
  if (freeSlots.length > 0) {
    return Promise.resolve(freeSlots.shift());
  }
  if (waiting.length >= MAX_QUEUE) {
    return Promise.reject(new Error("QUEUE_FULL"));
  }
  return new Promise((resolve, reject) => {
    const entry = {
      start: (slot) => {
        clearTimeout(timer);
        resolve(slot);
      },
    };
    const timer = setTimeout(() => {
      const i = waiting.indexOf(entry);
      if (i !== -1) waiting.splice(i, 1);
      reject(new Error("QUEUE_TIMEOUT"));
    }, QUEUE_TIMEOUT_MS);
    waiting.push(entry);
  });
}

function releaseSlot(slot) {
  const next = waiting.shift();
  if (next) next.start(slot);
  else freeSlots.push(slot);
}

// ── Compile ──────────────────────────────────────────────────────────────────
function tail(text, maxBytes) {
  if (Buffer.byteLength(text) <= maxBytes) return text;
  return "[…log truncated…]\n" + Buffer.from(text).subarray(-maxBytes).toString("utf8");
}

/**
 * Runs latexmk (reruns for references, bibtex/biber, makeindex) in a shell
 * that caps file size and CPU time. It gets its own process group so the
 * timeout kills latexmk and every engine it started.
 */
function runLatexmk(workDir, engine, uid) {
  return new Promise((resolve) => {
    const args = [
      "-norc",
      ENGINE_FLAGS[engine],
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-file-line-error",
      "-no-shell-escape",
      "-silent",
      "main.tex",
    ];
    const cpuSeconds = Math.ceil(COMPILE_TIMEOUT_MS / 1000) + 5;
    const proc = spawn(
      "/bin/sh",
      ["-c", `ulimit -f ${MAX_FILE_KB}; ulimit -t ${cpuSeconds}; exec latexmk "$@"`, "sh", ...args],
      {
        cwd: workDir,
        env: texEnv(workDir),
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
        ...(uid != null ? { uid, gid: uid } : {}),
      }
    );

    let output = "";
    const collect = (chunk) => {
      if (output.length < MAX_LOG_BYTES) output += chunk.toString();
    };
    proc.stdout.on("data", collect);
    proc.stderr.on("data", collect);

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-proc.pid, "SIGKILL");
      } catch {
        /* already exited */
      }
    }, COMPILE_TIMEOUT_MS);

    proc.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, timedOut, output });
    });
    proc.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: -1, signal: null, timedOut: false, output: `Failed to start latexmk: ${error.message}` });
    });
  });
}

/** True if the compile hit the per-file size cap (the engine is killed by SIGXFSZ). */
async function hitFileLimit(workDir) {
  const names = await readdir(workDir).catch(() => []);
  for (const name of names) {
    const s = await stat(path.join(workDir, name)).catch(() => null);
    // The write that crosses the cap is cut short, so allow for the unflushed buffer.
    if (s && s.isFile() && s.size >= MAX_FILE_KB * 1024 - 64 * 1024) return true;
  }
  return false;
}

async function compile(content, engine, slot) {
  const workDir = await mkdtemp(path.join(WORK_ROOT, "job-"));
  const uid = RUN_AS_TEX_USERS ? TEX_UID_BASE + slot : null;
  try {
    const texFile = path.join(workDir, "main.tex");
    await writeFile(texFile, content, "utf-8");
    if (uid != null) {
      // Private to this slot's user: other compiles can't read it.
      await chown(workDir, uid, uid);
      await chown(texFile, uid, uid);
      await chmod(workDir, 0o700);
    }
    const result = await runLatexmk(workDir, engine, uid);

    const texLog = await readFile(path.join(workDir, "main.log"), "utf8").catch(() => "");
    const log = tail(texLog || result.output, MAX_LOG_BYTES);

    if (result.timedOut) {
      return { ok: false, reason: "timeout", log: `${log}\n\nCompilation timed out after ${COMPILE_TIMEOUT_MS / 1000}s.` };
    }
    if (result.signal === "SIGXFSZ" || (await hitFileLimit(workDir))) {
      return { ok: false, reason: "limit", log: `${log}\n\nCompilation stopped: a file exceeded ${MAX_FILE_KB / 1024} MB.` };
    }

    const pdfPath = path.join(workDir, "main.pdf");
    const pdfStat = await stat(pdfPath).catch(() => null);
    if (result.code !== 0 || !pdfStat) {
      return { ok: false, reason: "error", log: log || result.output };
    }
    if (pdfStat.size > MAX_PDF_BYTES) {
      return { ok: false, reason: "limit", log: `${log}\n\nThe PDF is larger than ${MAX_PDF_BYTES / 1024 / 1024} MB.` };
    }
    return { ok: true, log, pdf: await readFile(pdfPath) };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── HTTP ─────────────────────────────────────────────────────────────────────
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", texlive: true, version: TEX_VERSION, active: activeCount(), queued: waiting.length });
});

app.use("/compile", (req, res, next) => {
  if (!isAuthorized(req.headers["x-api-secret"])) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.post("/compile", async (req, res) => {
  const { content } = req.body ?? {};
  let requestedEngine = req.body?.engine;

  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ ok: false, error: "Missing content" });
  }
  if (requestedEngine != null && requestedEngine !== "") {
    if (!Object.hasOwn(ENGINE_FLAGS, requestedEngine)) {
      return res.status(400).json({ ok: false, error: "Invalid engine" });
    }
  } else {
    requestedEngine = undefined;
  }
  const engine = requestedEngine ?? detectEngine(content);

  let slot;
  try {
    slot = await acquireSlot();
  } catch (error) {
    res.setHeader("Retry-After", "5");
    return res.status(503).json({
      ok: false,
      error: error.message === "QUEUE_FULL" ? "Compiler is busy, try again shortly" : "Timed out waiting for a free compiler",
    });
  }

  const started = Date.now();
  try {
    const result = await compile(content, engine, slot);
    console.log(`compile engine=${engine} ok=${result.ok}${result.ok ? "" : ` reason=${result.reason}`} ms=${Date.now() - started}`);
    if (!result.ok) {
      return res.status(422).json({ ok: false, error: "Compilation failed", reason: result.reason, engine, log: result.log });
    }
    res.json({ ok: true, engine, log: result.log, pdf: result.pdf.toString("base64") });
  } catch (error) {
    console.error("Compile error:", error);
    res.status(500).json({ ok: false, error: "Internal server error" });
  } finally {
    releaseSlot(slot);
  }
});

fs.mkdirSync(WORK_ROOT, { recursive: true, mode: 0o711 });
if (RUN_AS_TEX_USERS) {
  // Docker mounts /dev/shm world-writable at run time; compiles shouldn't be
  // able to write anywhere outside their job folder.
  try {
    fs.chmodSync("/dev/shm", 0o755);
  } catch {
    /* read-only on some hosts; /dev/shm is tiny there anyway */
  }
} else {
  console.warn("Not running as root: compiles run as this user (fine for local dev, not for production).");
}
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`LaTeX compiler listening on 0.0.0.0:${PORT} (${TEX_VERSION}; ${MAX_CONCURRENT} concurrent, queue ${MAX_QUEUE})`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
