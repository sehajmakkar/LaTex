const express = require("express");
const { spawn } = require("child_process");
const { writeFile, readFile, mkdir, rm } = require("fs/promises");
const { join } = require("path");
const { v4: uuidv4 } = require("uuid");
const os = require("os");
const { detectEngine } = require("./engine-detect");

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = parseInt(process.env.PORT || "8080", 10);
const COMPILE_TIMEOUT_MS = parseInt(process.env.COMPILE_TIMEOUT_MS || "60000", 10);
const API_SECRET = process.env.LATEX_API_SECRET;

app.get("/health", (req, res) => {
  res.json({ status: "ok", texlive: true });
});

app.use("/compile", (req, res, next) => {
  const token = req.headers["x-api-secret"];
  if (API_SECRET && token !== API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.post("/compile", async (req, res) => {
  const { content } = req.body;
  let requestedEngine = req.body.engine;

  if (!content || typeof content !== "string") {
    return res.status(400).json({ error: "Missing content" });
  }

  const validEngines = ["pdflatex", "xelatex", "lualatex"];
  if (requestedEngine != null && requestedEngine !== "") {
    if (!validEngines.includes(requestedEngine)) {
      return res.status(400).json({ error: "Invalid engine" });
    }
  } else {
    requestedEngine = undefined;
  }

  const engine = requestedEngine ?? detectEngine(content);

  const jobId = uuidv4();
  const workDir = join(os.tmpdir(), "latex-compile", jobId);

  try {
    await mkdir(workDir, { recursive: true });
    const texFile = join(workDir, "main.tex");
    await writeFile(texFile, content, "utf-8");

    const result = await compileLatex(workDir, "main.tex", engine);

    if (!result.success) {
      await cleanup(workDir);
      return res.status(422).json({
        ok: false,
        error: "Compilation failed",
        engine,
        log: result.log,
      });
    }

    const pdfPath = join(workDir, "main.pdf");
    const pdfBuffer = await readFile(pdfPath);

    await cleanup(workDir);

    res.json({
      ok: true,
      engine,
      log: result.log,
      pdf: pdfBuffer.toString("base64"),
    });
  } catch (error) {
    await cleanup(workDir);
    console.error("Compile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

function compileLatex(workDir, filename, engine) {
  return new Promise((resolve) => {
    const args = [
      "-interaction=nonstopmode",
      "-halt-on-error",
      `-output-directory=${workDir}`,
      filename,
    ];

    const proc = spawn(engine, args, {
      cwd: workDir,
      timeout: COMPILE_TIMEOUT_MS,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => (stdout += data.toString()));
    proc.stderr.on("data", (data) => (stderr += data.toString()));

    proc.on("close", (code) => {
      resolve({ success: code === 0, log: stdout + "\n" + stderr });
    });

    proc.on("error", (error) => {
      resolve({
        success: false,
        log: `Failed to start ${engine}: ${error.message}`,
      });
    });
  });
}

async function cleanup(dir) {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LaTeX compiler service listening on 0.0.0.0:${PORT}`);
});
