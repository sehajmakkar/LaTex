import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { aiMessageRepository } from "@/repositories/ai-message-repository";

const Body = z.object({ status: z.enum(["accepted", "partial", "rejected"]) });

/** Records what the user did with an AI answer's edits. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in first." } }, { status: 401 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid status" } }, { status: 400 });
  const { messageId } = await params;
  const row = await aiMessageRepository.setStatus(messageId, userId, body.data.status).catch(() => null);
  if (!row) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Message not found" } }, { status: 404 });
  return NextResponse.json({ data: { id: row.id, status: row.status } });
}
