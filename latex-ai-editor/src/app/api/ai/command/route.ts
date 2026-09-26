import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { aiService } from "@/services/ai-service";
import { COMMAND_DOC_LIMIT } from "@/services/ai/command-prompt";
import { isGeminiConfigured } from "@/lib/gemini";
import { AppError, UsageLimitError } from "@/lib/errors";
import { getPlanLimits, usagePeriod } from "@/lib/plans";
import { allowRequest } from "@/lib/rate-limit";
import { userRepository } from "@/repositories/user-repository";
import { userUsageRepository } from "@/repositories/user-usage-repository";
import { aiMessageRepository } from "@/repositories/ai-message-repository";
import { userService } from "@/services/user-service";
import { projectService } from "@/services/project-service";

const Body = z.object({
  projectId: z.string().uuid(),
  document: z.string().min(1).max(COMMAND_DOC_LIMIT, "This document is too large for the AI command bar."),
  instruction: z.string().trim().min(1).max(1000, "Keep the instruction under 1,000 characters."),
  scope: z.discriminatedUnion("type", [
    z.object({ type: z.literal("whole") }),
    z.object({ type: z.enum(["selection", "section"]), from: z.number().int().min(0), to: z.number().int().min(0), label: z.string().max(80).optional() }),
  ]),
  jobDescription: z.string().max(10_000).optional(),
  compileLog: z.string().max(20_000).optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(8).optional(),
});

function errorResponse(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Sign in to use the AI command bar.", 401);
  if (!isGeminiConfigured()) return errorResponse("CONFIG_ERROR", "AI is not configured on this server.", 500);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request", 400);
  const input = parsed.data;
  if (input.scope.type !== "whole" && (input.scope.from >= input.scope.to || input.scope.to > input.document.length)) {
    return errorResponse("VALIDATION_ERROR", "The selected range is invalid. Select the text again.", 400);
  }

  try {
    const project = await projectService.getById(input.projectId);
    if (project.userId !== userId) return errorResponse("NOT_FOUND", "Resume not found.", 404);

    let user = await userRepository.findByClerkId(userId);
    if (!user) {
      const clerkUser = await currentUser();
      user = await userService.ensureUser(userId, clerkUser?.emailAddresses?.[0]?.emailAddress ?? "", clerkUser?.fullName ?? null);
    }
    const limits = getPlanLimits(user.plan);
    const { today, monthStart } = usagePeriod();
    if (!allowRequest(`ai-command:${userId}`, limits.aiCommandsPerMinute)) {
      throw new UsageLimitError("Too many AI commands in a minute. Wait a moment and try again.", { kind: "burst" });
    }
    const used = await userUsageRepository.sumAiCommandsSince(userId, monthStart);
    if (used >= limits.aiCommandsPerMonth) {
      throw new UsageLimitError(
        limits.id === "free"
          ? `You've used all ${limits.aiCommandsPerMonth} free AI commands this month. Upgrade to Pro for ${getPlanLimits("pro").aiCommandsPerMonth}/month.`
          : `You've reached this month's fair-use limit of ${limits.aiCommandsPerMonth} AI commands.`,
        { kind: "monthly", plan: limits.id, used, limit: limits.aiCommandsPerMonth }
      );
    }

    const started = Date.now();
    const result = await aiService.command({
      instruction: input.instruction,
      document: input.document,
      scope: input.scope,
      jobDescription: input.jobDescription,
      compileLog: input.compileLog,
      history: input.history,
    });
    await userUsageRepository.incrementAiCommands(userId, today).catch((e) => console.error("AI command usage not recorded:", e));

    await aiMessageRepository.create({ projectId: project.id, userId, role: "user", content: input.instruction });
    const reply = await aiMessageRepository.create({
      projectId: project.id,
      userId,
      role: "assistant",
      content: result.message,
      edits: JSON.stringify(result.edits.map(({ find, replace }) => ({ find, replace }))),
      status: result.edits.length ? "pending" : null,
    });

    console.log(
      JSON.stringify({ event: "ai_command", userId, scope: input.scope.type, edits: result.edits.length, skipped: result.skipped, skippedReasons: result.skippedReasons.map((r) => r.slice(0, 80)), attempts: result.attempts, ms: Date.now() - started, tokens: result.usage })
    );
    return NextResponse.json({
      data: {
        messageId: reply.id,
        message: result.message,
        edits: result.edits,
        skipped: result.skipped,
        remaining: Math.max(0, limits.aiCommandsPerMonth - used - 1),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      console.warn(JSON.stringify({ event: "ai_command", userId, ok: false, code: error.code, details: error.details }));
      return errorResponse(error.code, error.message, error.statusCode);
    }
    console.error("AI command error:", error);
    return errorResponse("INTERNAL_ERROR", "The AI command failed. Please try again.", 500);
  }
}
