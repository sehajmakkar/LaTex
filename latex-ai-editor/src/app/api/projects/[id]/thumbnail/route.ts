import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { projectRepository } from "@/repositories/project-repository";
import { thumbnailService } from "@/services/thumbnail-service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The resume's dashboard thumbnail (first page of its last compile). Only for
 * the owner: it contains personal details. The URL carries ?v=<timestamp>, so
 * the browser can cache each version for good.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId) return new NextResponse(null, { status: 401 });
  if (!UUID.test(id)) return new NextResponse(null, { status: 404 });
  const project = await projectRepository.findById(id).catch(() => null);
  if (!project || project.userId !== userId || !project.thumbnailUpdatedAt) return new NextResponse(null, { status: 404 });
  const image = await thumbnailService.get(id);
  if (!image) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(image), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
