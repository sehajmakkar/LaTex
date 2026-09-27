import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { MAX_CONTENT_SIZE } from "@/lib/constants";
import { compileSmart } from "@/services/compile/smart-compile";
import { toEngine } from "@/lib/latex-engine";
import { getPlanLimits, usagePeriod } from "@/lib/plans";
import { allowRequest } from "@/lib/rate-limit";
import { userRepository } from "@/repositories/user-repository";
import { userUsageRepository } from "@/repositories/user-usage-repository";
import { projectRepository } from "@/repositories/project-repository";
import { thumbnailService } from "@/services/thumbnail-service";

const CompileRequestSchema = z.object({
  projectId: z.string(),
  content: z.string().max(MAX_CONTENT_SIZE),
  /** Force an engine for this compile (otherwise the project's compiler setting / auto). */
  engine: z.enum(["pdflatex", "xelatex", "lualatex"]).optional(),
  /** Overleaf's "Stop on first error" mode. Default: compile despite errors. */
  stopOnFirstError: z.boolean().optional(),
  /** Update the dashboard thumbnail (false for previews of unsaved AI changes). */
  thumbnail: z.boolean().optional().default(true),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const errorJson = (code: string, message: string, status: number) => NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: NextRequest) {
  // Signed in only (the middleware checks too): every compile uses our compile service.
  const { userId } = await auth();
  if (!userId) return errorJson("UNAUTHORIZED", "Sign in to compile.", 401);

  const parsed = CompileRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }
  if (!parsed.data.content.trim()) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "The document is empty." } }, { status: 400 });
  }

  // The project (its settings drive the engine choice) must be the caller's own.
  const { projectId } = parsed.data;
  const { today, monthStart } = usagePeriod();
  const [project, user, used] = await Promise.all([
    UUID.test(projectId) ? projectRepository.findById(projectId).catch(() => null) : Promise.resolve(null),
    userRepository.findByClerkId(userId).catch(() => null),
    userUsageRepository.sumCompilesSince(userId, monthStart).catch(() => 0),
  ]);
  if (UUID.test(projectId) && (!project || project.userId !== userId)) return errorJson("NOT_FOUND", "Resume not found.", 404);

  // Limits: a per-minute guard against scripts, and a monthly cap (Pro: fair use).
  const limits = getPlanLimits(user?.plan);
  if (!allowRequest(`compile:${userId}`, limits.compilesPerMinute)) {
    return errorJson("USAGE_LIMIT_REACHED", "You're compiling very quickly. Wait a few seconds and try again.", 429);
  }
  if (used >= limits.compilesPerMonth) {
    return errorJson(
      "USAGE_LIMIT_REACHED",
      limits.id === "free"
        ? `You've used all ${limits.compilesPerMonth} free compiles this month. Upgrade to Pro for unlimited compiles.`
        : `You've reached this month's fair-use limit of ${limits.compilesPerMonth} compiles. Contact us if you need more.`,
      429
    );
  }
  const wantThumbnail = parsed.data.thumbnail && !!project;
  // Counted once per compile request (engine fallbacks inside it don't count extra).
  after(() => userUsageRepository.incrementCompiles(userId, today).catch((e) => console.error("Compile usage not recorded:", e)));

  try {
    const result = await compileSmart(parsed.data.content, {
      forced: parsed.data.engine ?? toEngine(project?.compiler),
      lastGood: toEngine(project?.lastEngine),
      thumbnail: wantThumbnail,
      stopOnFirstError: parsed.data.stopOnFirstError,
    });
    const thumbnail = result.ok ? result.thumbnail : undefined;
    if (project) {
      // After the response: the user gets the PDF without waiting for these writes.
      if (thumbnail) after(() => thumbnailService.save(projectId, thumbnail).catch((e) => console.error("Thumbnail not saved:", e)));
      // Auto mode remembers the engine that compiled cleanly, so the next compile starts there.
      if (result.ok && result.errors.length === 0 && project.compiler === "auto" && project.lastEngine !== result.engine) {
        const engine = result.engine;
        after(() => projectRepository.setLastEngine(projectId, engine).catch(() => {}));
      }
    }
    if (result.attempts.length > 1) {
      console.log(JSON.stringify({ event: "compile_fallback", projectId, attempts: result.attempts }));
    }
    if (!result.ok) {
      return NextResponse.json(
        {
          error: {
            code: result.code,
            message: result.message,
            ...(result.code === "COMPILE_ERROR"
              ? { details: { log: result.log ?? "", engine: result.engine, errors: result.errors ?? [], attempts: result.attempts } }
              : {}),
          },
        },
        { status: result.status ?? 502 }
      );
    }
    return NextResponse.json({
      data: {
        pdfUrl: `data:application/pdf;base64,${result.pdf.toString("base64")}`,
        log: result.log,
        engine: result.engine,
        /** LaTeX errors the PDF was produced despite. */
        errors: result.errors,
        switchedFrom: result.switchedFrom ?? null,
        attempts: result.attempts,
      },
    });
  } catch (error) {
    console.error("Compile error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
