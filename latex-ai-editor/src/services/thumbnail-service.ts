import sharp from "sharp";
import { copyResumeObject, deleteResumeObject, getResumeObject, isR2Enabled, uploadResumeObject } from "@/services/storage/r2";
import { projectRepository } from "@/repositories/project-repository";

/**
 * Dashboard thumbnails: the first page of a resume's last successful compile,
 * rendered by the compile service (pdftoppm), stored in R2 as WebP. Private:
 * only served to the owner through /api/projects/[id]/thumbnail.
 */
const keyFor = (projectId: string) => `thumbnails/${projectId}.webp`;

export const thumbnailService = {
  async save(projectId: string, png: Buffer) {
    if (!isR2Enabled()) return;
    const webp = await sharp(png).resize({ width: 480, withoutEnlargement: true }).flatten({ background: "#ffffff" }).webp({ quality: 72 }).toBuffer();
    await uploadResumeObject({ key: keyFor(projectId), body: webp, contentType: "image/webp" });
    await projectRepository.setThumbnailUpdatedAt(projectId, new Date());
  },

  async get(projectId: string): Promise<Buffer | null> {
    if (!isR2Enabled()) return null;
    try {
      const res = await getResumeObject({ key: keyFor(projectId) });
      return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
    } catch {
      return null;
    }
  },

  async copy(fromProjectId: string, toProjectId: string) {
    if (!isR2Enabled()) return;
    await copyResumeObject({ from: keyFor(fromProjectId), to: keyFor(toProjectId) });
    await projectRepository.setThumbnailUpdatedAt(toProjectId, new Date());
  },

  async remove(projectId: string) {
    await deleteResumeObject({ key: keyFor(projectId) });
  },
};
