import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { projectVersionRepository } from "@/repositories/project-version-repository";

/** One snapshot's content, for restoring. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in first." } }, { status: 401 });
  const { id, versionId } = await params;
  const row = await projectVersionRepository.get(versionId, id, userId).catch(() => null);
  if (!row) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Version not found" } }, { status: 404 });
  return NextResponse.json({ data: { id: row.id, label: row.label, content: row.content, createdAt: row.createdAt } });
}
