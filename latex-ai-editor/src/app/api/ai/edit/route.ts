import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { aiService } from "@/services/ai-service";
import { isGeminiConfigured } from "@/lib/gemini";
import { AppError, UsageLimitError } from "@/lib/errors";
import { getPlanLimits, usagePeriod } from "@/lib/plans";
import { allowRequest } from "@/lib/rate-limit";
import { MAX_CONTENT_SIZE } from "@/lib/constants";
import { userRepository } from "@/repositories/user-repository";
import { userService } from "@/services/user-service";
import { userUsageRepository } from "@/repositories/user-usage-repository";

// Context can be the whole document (the server trims it); prompt and
// selection are capped so one request can't become an expensive prompt.
const AIEditRequestSchema = z.object({
  selection: z.string().max(8_000, "Select at most 8,000 characters for an AI edit."),
  codeBefore: z.string().max(MAX_CONTENT_SIZE),
  codeAfter: z.string().max(MAX_CONTENT_SIZE),
  prompt: z.string().trim().min(1).max(500, "Keep the instruction under 500 characters."),
});

function errorResponse(error: AppError) {
  return NextResponse.json(
    { error: { code: error.code, message: error.message } },
    { status: error.statusCode }
  );
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in to use AI edits." } },
      { status: 401 }
    );
  }
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: { code: "CONFIG_ERROR", message: "AI is not configured on this server." } },
      { status: 500 }
    );
  }

  const parsed = AIEditRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message, details: parsed.error.flatten() } },
      { status: 400 }
    );
  }
  const { selection, codeBefore, codeAfter, prompt } = parsed.data;

  // Usage rows reference users(id), so make sure the row exists before spending
  // an AI call (normally created on the dashboard, but a deep link can skip it).
  let user = await userRepository.findByClerkId(userId);
  if (!user) {
    const clerkUser = await currentUser();
    user = await userService.ensureUser(
      userId,
      clerkUser?.emailAddresses?.[0]?.emailAddress ?? "",
      clerkUser?.fullName ?? null
    );
  }
  const limits = getPlanLimits(user?.plan);
  const { today, monthStart } = usagePeriod();

  if (!allowRequest(`ai-edit:${userId}`, limits.aiEditsPerMinute)) {
    return errorResponse(new UsageLimitError("Too many AI edits in a minute. Wait a moment and try again.", { kind: "burst" }));
  }
  const used = await userUsageRepository.sumAiEditsSince(userId, monthStart);
  if (used >= limits.aiEditsPerMonth) {
    return errorResponse(
      new UsageLimitError(
        limits.id === "free"
          ? `You've used all ${limits.aiEditsPerMonth} free AI edits this month. Upgrade to Pro for ${getPlanLimits("pro").aiEditsPerMonth}/month.`
          : `You've reached this month's fair-use limit of ${limits.aiEditsPerMonth} AI edits.`,
        { kind: "monthly", plan: limits.id, used, limit: limits.aiEditsPerMonth }
      )
    );
  }

  const started = Date.now();
  try {
    const result = await aiService.inlineEdit({ instruction: prompt, selection, codeBefore, codeAfter });
    // Never throw away a finished edit because counting it failed.
    await userUsageRepository.incrementAiEdits(userId, today).catch((error) => console.error("AI edit usage not recorded:", error));
    console.log(
      JSON.stringify({ event: "ai_edit", userId, ok: true, model: result.model, attempts: result.attempts, ms: Date.now() - started, tokens: result.usage })
    );
    return NextResponse.json({
      data: {
        replacement: result.replacement,
        notes: result.notes ?? null,
        remaining: Math.max(0, limits.aiEditsPerMonth - used - 1),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      console.warn(JSON.stringify({ event: "ai_edit", userId, ok: false, code: error.code, ms: Date.now() - started, details: error.details }));
      return errorResponse(error);
    }
    console.error("AI edit error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process the AI edit." } },
      { status: 500 }
    );
  }
}
