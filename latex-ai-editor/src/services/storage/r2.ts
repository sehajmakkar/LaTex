import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
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


export async function deleteResumeObject(params: { key: string }): Promise<void> {
  if (!r2Client) return;
  await r2Client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME!, Key: params.key }));
}

export async function copyResumeObject(params: { from: string; to: string }): Promise<void> {
  if (!r2Client) return;
  await r2Client.send(
    new CopyObjectCommand({ Bucket: env.R2_BUCKET_NAME!, CopySource: `${env.R2_BUCKET_NAME}/${params.from}`, Key: params.to })
  );
}

/** Every key under a prefix (paginated). */
export async function listResumeObjectKeys(prefix: string): Promise<string[]> {
  if (!r2Client) return [];
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await r2Client.send(new ListObjectsV2Command({ Bucket: env.R2_BUCKET_NAME!, Prefix: prefix, ContinuationToken: token }));
    for (const o of res.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

/** Deletes many keys (1,000 per request). Missing keys are fine. Returns how many were requested. */
export async function deleteResumeObjects(keys: string[]): Promise<number> {
  if (!r2Client || keys.length === 0) return 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const res = await r2Client.send(
      new DeleteObjectsCommand({ Bucket: env.R2_BUCKET_NAME!, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } })
    );
    if (res.Errors?.length) throw new Error(`R2 delete failed for ${res.Errors.length} object(s): ${res.Errors[0].Key} ${res.Errors[0].Message}`);
  }
  return keys.length;
}
