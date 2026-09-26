import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { MAX_CONTENT_SIZE } from "@/lib/constants";
import { getPlanLimits } from "@/lib/plans";
import { projectService } from "@/services/project-service";
import { userRepository } from "@/repositories/user-repository";
import { projectVersionRepository } from "@/repositories/project-version-repository";

type Params = { params: Promise<{ id: string }> };
const Body = z.object({ content: z.string().max(MAX_CONTENT_SIZE), label: z.string().trim().min(1).max(120) });

async function ownProject(id: string, userId: string) {
  const project = await projectService.getById(id).catch(() => null);
  return project && project.userId === userId ? project : null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in first." } }, { status: 401 });
  const { id } = await params;
  if (!(await ownProject(id, userId))) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Resume not found" } }, { status: 404 });
  return NextResponse.json({ data: await projectVersionRepository.list(id, userId) });
}

/** Saves a snapshot (e.g. before applying AI changes). Older ones beyond the plan's allowance are pruned. */
export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in first." } }, { status: 401 });
  const { id } = await params;
  if (!(await ownProject(id, userId))) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Resume not found" } }, { status: 404 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid version" } }, { status: 400 });
  const keep = getPlanLimits((await userRepository.findByClerkId(userId))?.plan).versionsKept;
  const row = await projectVersionRepository.create({ projectId: id, userId, ...body.data }, keep);
  return NextResponse.json({ data: { id: row.id, label: row.label, createdAt: row.createdAt } }, { status: 201 });
}
