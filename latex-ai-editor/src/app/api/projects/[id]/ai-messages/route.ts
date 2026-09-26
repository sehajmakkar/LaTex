import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { aiMessageRepository } from "@/repositories/ai-message-repository";

/** The AI command bar conversation for one resume (most recent 30 messages). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in first." } }, { status: 401 });
  const { id } = await params;
  const rows = await aiMessageRepository.listRecent(id, userId).catch(() => []);
  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      status: r.status,
      editCount: r.edits ? (JSON.parse(r.edits) as unknown[]).length : 0,
      createdAt: r.createdAt,
    })),
  });
}
