import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { atsRepository } from "@/repositories/ats-repository";
import { userRepository } from "@/repositories/user-repository";
import { userUsageRepository } from "@/repositories/user-usage-repository";
import { userService } from "@/services/user-service";
import { projectService } from "@/services/project-service";
import { compileLatex } from "@/services/compile-service";
import { extractDocx, extractPdf, extractTxt, type Extraction } from "@/services/ats/extract";
import { buildAtsReport } from "@/services/ats/pipeline";
import { isR2Enabled, uploadResumeObject } from "@/services/storage/r2";
import { isGeminiConfigured } from "@/lib/gemini";
import { getPlanLimits, usagePeriod } from "@/lib/plans";
import { allowRequest } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const Options = z.object({
  jobDescription: z.string().max(10_000, "Keep the job description under 10,000 characters.").optional(),
  targetRole: z.string().max(120, "Keep the target role under 120 characters.").optional(),
});
const ProjectBody = Options.extend({ projectId: z.string().uuid() });

type Source = "editor" | "upload_pdf" | "upload_docx" | "upload_txt";

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function storeFile(userId: string, name: string, body: Buffer, contentType: string): Promise<string | null> {
  if (!isR2Enabled()) return null;
  const key = `ats-resumes/${userId}/${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9.\-_]/g, "_") || "resume"}`;
  try {
    await uploadResumeObject({ key, body, contentType });
    return key;
  } catch (e) {
    console.error("ATS scan: R2 upload failed, continuing without the file:", e);
    return null;
  }
}

/**
 * One scan endpoint for both sources:
 * - multipart/form-data with `file` (PDF, DOCX or TXT), or
 * - JSON with `projectId`: the project is compiled to PDF first, so it's
 *   checked exactly as an employer would receive it.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("UNAUTHORIZED", "Sign in to run an ATS check.", 401);
  if (!allowRequest(`ats-scan:${userId}`, 10)) return error("USAGE_LIMIT_REACHED", "Too many scans in a minute. Wait a moment.", 429);

  try {
    let extraction: Extraction;
    let source: Source;
    let projectId: string | null = null;
    let fileName: string;
    let fileKey: string | null;
    let mimeType: string;
    let options: z.infer<typeof Options>;

    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const parsedOptions = Options.safeParse({
        jobDescription: (form.get("jobDescription") as string | null) || undefined,
        targetRole: (form.get("targetRole") as string | null) || undefined,
      });
      if (!parsedOptions.success) return error("VALIDATION_ERROR", parsedOptions.error.issues[0].message, 400);
      options = parsedOptions.data;
      if (!(file instanceof File)) return error("VALIDATION_ERROR", "Choose a resume file to upload.", 400);
      if (file.size > MAX_FILE_BYTES) return error("FILE_TOO_LARGE", "The file is larger than 5 MB.", 413);

      const buffer = Buffer.from(await file.arrayBuffer());
      const lower = file.name.toLowerCase();
      mimeType = file.type || "application/octet-stream";
      fileName = file.name;
      if (lower.endsWith(".pdf") || mimeType === "application/pdf") {
        if (buffer.subarray(0, 5).toString() !== "%PDF-") return error("INVALID_FILE", "That file isn't a valid PDF.", 422);
        extraction = await extractPdf(buffer).catch(() => {
          throw new AppError("PDF_PARSE_FAILED", "We couldn't read this PDF. Try exporting it again, or upload a DOCX.", 422);
        });
        source = "upload_pdf";
        mimeType = "application/pdf";
      } else if (lower.endsWith(".docx")) {
        if (buffer.subarray(0, 2).toString() !== "PK") return error("INVALID_FILE", "That file isn't a valid DOCX.", 422);
        extraction = await extractDocx(buffer).catch(() => {
          throw new AppError("DOCX_PARSE_FAILED", "We couldn't read this DOCX. Try saving it again, or upload a PDF.", 422);
        });
        source = "upload_docx";
      } else if (lower.endsWith(".txt")) {
        extraction = extractTxt(buffer);
        source = "upload_txt";
      } else {
        return error("UNSUPPORTED_FILE", "Upload a PDF, DOCX or TXT file.", 415);
      }
      fileKey = await storeFile(userId, file.name, buffer, mimeType);
    } else {
      const body = ProjectBody.safeParse(await req.json().catch(() => null));
      if (!body.success) return error("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Invalid request", 400);
      options = body.data;
      const project = await projectService.getById(body.data.projectId);
      if (project.userId !== userId) return error("NOT_FOUND", "Resume not found.", 404);
      if (!project.content.trim()) return error("EMPTY_RESUME", "This resume is empty. Add some content first.", 422);

      const compiled = await compileLatex(project.content);
      if (!compiled.ok) {
        return compiled.code === "COMPILE_ERROR"
          ? error("COMPILE_ERROR", "This resume doesn't compile yet. Fix the errors in the editor, then run the check again.", 422)
          : error(compiled.code, compiled.message, compiled.status ?? 502);
      }
      extraction = await extractPdf(compiled.pdf);
      source = "editor";
      projectId = project.id;
      fileName = `${project.name}.pdf`;
      mimeType = "application/pdf";
      fileKey = await storeFile(userId, fileName, compiled.pdf, mimeType);
    }

    if (extraction.text.length < 50 && extraction.layout.hasTextLayer) {
      return error("EMPTY_RESUME", "We couldn't find enough text in this resume to check.", 422);
    }

    // The AI review is metered per month; the rule-based checks always run.
    let user = await userRepository.findByClerkId(userId);
    if (!user) {
      const clerkUser = await currentUser();
      user = await userService.ensureUser(userId, clerkUser?.emailAddresses?.[0]?.emailAddress ?? "", clerkUser?.fullName ?? null);
    }
    const limits = getPlanLimits(user.plan);
    const { today, monthStart } = usagePeriod();
    const used = await userUsageRepository.sumAtsScansSince(userId, monthStart);
    const useAi = isGeminiConfigured() && extraction.layout.hasTextLayer && used < limits.atsAiReviewsPerMonth;

    const started = Date.now();
    const report = await buildAtsReport({ text: extraction.text, layout: extraction.layout, ...options, useAi });
    if (report.aiReview === "complete") {
      await userUsageRepository.getOrCreateToday(userId, today);
      await userUsageRepository.incrementAtsScans(userId, today).catch((e) => console.error("ATS usage not recorded:", e));
    }
    console.log(JSON.stringify({ event: "ats_scan", userId, source, ai: report.aiReview, ms: Date.now() - started, overall: report.overall, match: report.jobMatch?.score ?? null }));

    const stored = await atsRepository.create({
      userId,
      projectId,
      source,
      resumeText: extraction.text.slice(0, 50_000),
      resumeFileKey: fileKey,
      resumeFileName: fileName,
      resumeFileMimeType: mimeType,
      score: report.overall,
      parseScore: report.groupScores.parsing,
      qualityScore: report.jobMatch?.score ?? 0,
      report: JSON.stringify(report),
      jobDescription: options.jobDescription?.trim() || options.targetRole?.trim() || null,
    });

    return NextResponse.json({ data: { id: stored.id } });
  } catch (e) {
    if (e instanceof AppError) return error(e.code, e.message, e.statusCode);
    console.error("ATS scan error:", e);
    return error("INTERNAL_ERROR", "The ATS check failed. Please try again.", 500);
  }
}
