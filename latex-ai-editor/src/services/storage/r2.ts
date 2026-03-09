import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

const hasR2Config =
  !!env.R2_ENDPOINT && !!env.R2_ACCESS_KEY_ID && !!env.R2_SECRET_ACCESS_KEY && !!env.R2_BUCKET_NAME;

const r2Client = hasR2Config
  ? new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export function isR2Enabled(): boolean {
  return !!r2Client;
}

export async function uploadResumeObject(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<void> {
  if (!r2Client) return;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME!,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}

export async function getResumeObject(params: { key: string }) {
  if (!r2Client) {
    throw new Error("R2 is not configured");
  }

  const res = await r2Client.send(
    new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME!,
      Key: params.key,
    })
  );

  return res;
}

