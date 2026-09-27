import { NextRequest, NextResponse, after } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { AppError, UsageLimitError } from "@/lib/errors";
import { isGeminiConfigured } from "@/lib/gemini";
import { getPlanLimits, usagePeriod } from "@/lib/plans";
import { allowRequest } from "@/lib/rate-limit";
import { userRepository } from "@/repositories/user-repository";
import { userUsageRepository } from "@/repositories/user-usage-repository";
import { userService } from "@/services/user-service";
import { projectService } from "@/services/project-service";
import { extractDocx, extractPdf, extractTxt, type Extraction } from "@/services/ats/extract";
import { importTexFile, importZip, LatexImportError, type LatexImport } from "@/services/import/latex-import";
import { importWithAI } from "@/services/import/ai-import";
import { compileSmart } from "@/services/compile/smart-compile";
import { thumbnailService } from "@/services/thumbnail-service";
import { renderResume, unsupportedChars } from "@/services/import/render";
import { resumeStrings } from "@/services/import/resume-data";
import type { ImportReport } from "@/services/import/types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PASTE_CHARS = 30_000;


function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

const titleFrom = (fileName: string) =>
  fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Imported resume";

/**
 * Imports an existing resume as a new project.
 * - .tex / Overleaf .zip → used as-is (no AI, keeps the design).
 * - PDF / DOCX / TXT / pasted text → read by AI into structured data, rendered
 *   into the Jake's Resume layout, and checked line by line against the file.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("UNAUTHORIZED", "Sign in to import a resume.", 401);

  try {
    let user = await userRepository.findByClerkId(userId);
    if (!user) {
      const clerkUser = await currentUser();
      user = await userService.ensureUser(userId, clerkUser?.emailAddresses?.[0]?.emailAddress ?? "", clerkUser?.fullName ?? null);
    }
    const limits = getPlanLimits(user?.plan);
    if (!(await userService.canCreateProject(userId))) {
      return error(
        "PROJECT_LIMIT_REACHED",
        `The free plan includes ${limits.projects} resumes. Delete one, or upgrade to Pro for unlimited resumes.`,
        403
      );
    }

    let fileType: ImportReport["fileType"];
    let fileName: string;
    let buffer: Buffer | null = null;
    let pasted = "";
    const form = await req.formData().catch(() => null);
    if (!form) return error("VALIDATION_ERROR", "Upload a file or paste your resume text.", 400);
    const file = form.get("file");
    if (file instanceof File) {
      if (file.size > MAX_FILE_BYTES) return error("FILE_TOO_LARGE", "The file is larger than 5 MB.", 413);
      buffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name;
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".tex")) fileType = "tex";
      else if (lower.endsWith(".zip")) fileType = "zip";
      else if (lower.endsWith(".pdf")) fileType = "pdf";
      else if (lower.endsWith(".docx")) fileType = "docx";
      else if (lower.endsWith(".txt") || lower.endsWith(".md")) fileType = "txt";
      else return error("UNSUPPORTED_FILE", "Upload a PDF, DOCX, .tex or Overleaf .zip file.", 415);
      const magic = buffer.subarray(0, 5).toString();
      if (fileType === "pdf" && magic !== "%PDF-") return error("INVALID_FILE", "That file isn't a valid PDF.", 422);
      if ((fileType === "docx" || fileType === "zip") && !magic.startsWith("PK")) {
        return error("INVALID_FILE", `That file isn't a valid ${fileType.toUpperCase()}.`, 422);
      }
    } else {
      pasted = String(form.get("text") ?? "").trim();
      if (pasted.length < 50) return error("VALIDATION_ERROR", "Paste your whole resume (at least a few lines).", 400);
      if (pasted.length > MAX_PASTE_CHARS) return error("VALIDATION_ERROR", "That's too long for a resume (30,000 characters max).", 400);
      fileType = "paste";
      fileName = "Pasted resume";
    }

    // ── LaTeX: keep it as it is ───────────────────────────────────────────────
    if (fileType === "tex" || fileType === "zip") {
      let result: LatexImport;
      try {
        result = fileType === "tex" ? importTexFile(buffer!, fileName) : await importZip(buffer!);
      } catch (e) {
        if (e instanceof LatexImportError) return error("INVALID_PROJECT", e.message, 422);
        throw e;
      }
      // Overleaf keeps the compiler in project settings, not the source: find the engine that works.
      const probe = await compileSmart(result.content, { thumbnail: true });
      const project = await projectService.createForUser(userId, {
        name: titleFrom(fileName),
        content: result.content,
        templateId: null,
        lastEngine: probe.ok ? probe.engine : null,
      });
      const report: ImportReport = {
        method: "latex",
        fileType,
        warnings: result.warnings,
        unverified: [],
        missed: [],
        coverage: null,
        mainFile: result.mainFile,
        embedded: result.embedded,
        compiles: probe.ok,
        engine: probe.ok ? probe.engine : undefined,
        compileErrors: probe.ok ? probe.errors.length : undefined,
        compileError: probe.ok
          ? probe.errors[0]?.message
          : (probe.errors?.[0]?.message ?? (probe.log ?? "").split("\n").find((l) => /^!|:\d+: /.test(l))?.slice(0, 300) ?? probe.message),
      };
      console.log(JSON.stringify({ event: "import", userId, method: "latex", fileType, embedded: result.embedded.length, warnings: result.warnings.length }));
      const thumb = probe.ok ? probe.thumbnail : undefined;
      if (thumb) after(() => thumbnailService.save(project.id, thumb).catch((e) => console.error("Thumbnail not saved:", e)));
      const pdfUrl = probe.ok ? `data:application/pdf;base64,${probe.pdf.toString("base64")}` : null;
      return NextResponse.json({ data: { projectId: project.id, name: project.name, report, pdfUrl } }, { status: 201 });
    }

    // ── PDF / DOCX / text: AI reads it, we render and verify ─────────────────
    if (!isGeminiConfigured()) return error("CONFIG_ERROR", "AI is not configured on this server.", 500);
    const { today, monthStart } = usagePeriod();
    const used = await userUsageRepository.sumAiImportsSince(userId, monthStart);
    if (used >= limits.aiImportsPerMonth) {
      throw new UsageLimitError(
        limits.id === "free"
          ? `You've used all ${limits.aiImportsPerMonth} free PDF/Word imports this month. Upgrade to Pro for ${getPlanLimits("pro").aiImportsPerMonth}/month. (.tex and Overleaf .zip imports are always free.)`
          : `You've reached this month's fair-use limit of ${limits.aiImportsPerMonth} imports.`,
        { kind: "monthly", plan: limits.id, used, limit: limits.aiImportsPerMonth }
      );
    }

    if (!allowRequest(`import:${userId}`, 3)) {
      throw new UsageLimitError("Too many imports in a minute. Wait a moment and try again.", { kind: "burst" });
    }

    let extraction: Extraction;
    if (fileType === "pdf") {
      extraction = await extractPdf(buffer!).catch(() => {
        throw new AppError("PDF_PARSE_FAILED", "We couldn't read this PDF. Try exporting it again, or upload a DOCX.", 422);
      });
    } else if (fileType === "docx") {
      extraction = await extractDocx(buffer!).catch(() => {
        throw new AppError("DOCX_PARSE_FAILED", "We couldn't read this DOCX. Try saving it again, or upload a PDF.", 422);
      });
    } else {
      extraction = extractTxt(buffer ?? Buffer.from(pasted, "utf-8"));
    }
    const scanned = fileType === "pdf" && !extraction.layout.hasTextLayer;
    if (!scanned && extraction.text.replace(/\s/g, "").length < 50) {
      return error("EMPTY_FILE", "We couldn't find any text in this file.", 422);
    }

    const started = Date.now();
    const result = await importWithAI({ pdf: fileType === "pdf" ? buffer! : undefined, text: extraction.text, scanned });
    let content = renderResume(result.data);
    const check = result.check;
    if (check?.unverified.length) {
      // Flag them in the LaTeX too, so the user sees them while editing.
      const list = check.unverified.slice(0, 20).map((u) => `%   - ${u.text.replace(/\s+/g, " ").slice(0, 120)}`);
      content = `% CHECK THESE: they weren't found word-for-word in your file.\n${list.join("\n")}\n${content}`;
    }
    // The renderer escapes everything, so this should always compile; check anyway.
    const compiled = await compileSmart(content, { thumbnail: true });
    const project = await projectService.createForUser(userId, {
      name: result.data.name.trim() ? `${result.data.name.trim().slice(0, 60)} (imported)` : titleFrom(fileName),
      content,
      templateId: null,
      lastEngine: compiled.ok ? compiled.engine : null,
    });
    await userUsageRepository.incrementAiImports(userId, today).catch((e) => console.error("Import usage not recorded:", e));

    const warnings: string[] = [];
    if (scanned) warnings.push("This PDF is a scanned image, so the AI read it visually and we couldn't check it against the file's text. Compare it carefully.");
    if (extraction.layout.multiColumn) warnings.push("Your file has two columns. It's now one column, with the sidebar sections after the main ones.");
    const dropped = unsupportedChars(resumeStrings(result.data).map((s) => s.text).join(" "));
    if (dropped.length) warnings.push(`Some symbols can't be typeset and were left out: ${dropped.slice(0, 8).join(" ")}`);
    if (extraction.layout.images) warnings.push("Images (such as a photo) aren't imported.");

    const report: ImportReport = {
      method: "ai",
      fileType,
      warnings,
      unverified: check?.unverified ?? [],
      missed: check?.missed.slice(0, 50) ?? [],
      coverage: check ? Math.round(check.coverage * 1000) / 1000 : null,
      compiles: compiled.ok,
      compileError: compiled.ok ? undefined : compiled.message,
    };
    console.log(
      JSON.stringify({
        event: "import",
        userId,
        method: "ai",
        fileType,
        coverage: report.coverage,
        unverified: report.unverified.length,
        missed: report.missed.length,
        attempts: result.attempts,
        ms: Date.now() - started,
        tokens: result.usage,
        compiles: compiled.ok,
      })
    );
    const aiThumb = compiled.ok ? compiled.thumbnail : undefined;
    if (aiThumb) after(() => thumbnailService.save(project.id, aiThumb).catch((e) => console.error("Thumbnail not saved:", e)));
    const pdfUrl = compiled.ok ? `data:application/pdf;base64,${compiled.pdf.toString("base64")}` : null;
    return NextResponse.json({ data: { projectId: project.id, name: project.name, report, pdfUrl } }, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) return error(e.code, e.message, e.statusCode);
    console.error("Import error:", e);
    return error("INTERNAL_ERROR", "The import failed. Please try again.", 500);
  }
}
