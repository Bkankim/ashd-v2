import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "./client";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("r2/storage");

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  if (!bucket) throw new Error("R2_BUCKET_NAME is not configured");
  return bucket;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  contentLength: number,
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error(
      `File type "${contentType}" is not allowed. Allowed: ${[...ALLOWED_MIME_TYPES].join(", ")}`,
    );
  }
  if (contentLength > MAX_FILE_SIZE) {
    throw new Error(
      `File size ${contentLength} exceeds maximum ${MAX_FILE_SIZE} bytes (10MB)`,
    );
  }
  if (contentLength <= 0) {
    throw new Error("File size must be greater than 0");
  }

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const url = await getSignedUrl(getR2Client(), command, { expiresIn: 300 });
  log.info({ key, contentType, contentLength }, "Presigned upload URL created");
  return url;
}

export interface R2ObjectHead {
  size: number;
  contentType: string | undefined;
}

/**
 * HEAD the object to verify it actually exists and to read its true size
 * and content type. Presigned PUT URLs do not reliably enforce the
 * client-declared Content-Length, so this is the server-side source of
 * truth before OCR processing.
 */
export async function headFile(key: string): Promise<R2ObjectHead> {
  const command = new HeadObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });
  const response = await getR2Client().send(command);
  return {
    size: response.ContentLength ?? 0,
    contentType: response.ContentType,
  };
}

export function isAllowedUpload(head: R2ObjectHead): boolean {
  return (
    head.size > 0 &&
    head.size <= MAX_FILE_SIZE &&
    head.contentType !== undefined &&
    ALLOWED_MIME_TYPES.has(head.contentType)
  );
}

export async function downloadFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  const response = await getR2Client().send(command);
  if (!response.Body) {
    throw new Error(`File not found or empty: ${key}`);
  }

  const byteArray = await response.Body.transformToByteArray();
  log.info({ key, bytes: byteArray.length }, "File downloaded from R2");
  return Buffer.from(byteArray);
}

export async function listFiles(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: getBucketName(),
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const response = await getR2Client().send(command);

    for (const obj of response.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  log.info({ prefix, count: keys.length }, "Listed R2 files");
  return keys;
}

export async function deleteFiles(keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];

  const failedKeys: string[] = [];
  const batchSize = 1000;
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += batchSize) {
    batches.push(keys.slice(i, i + batchSize));
  }

  const results = await Promise.all(
    batches.map((batch) => {
      const command = new DeleteObjectsCommand({
        Bucket: getBucketName(),
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
          Quiet: false,
        },
      });
      return getR2Client().send(command);
    }),
  );

  for (const response of results) {
    if (response.Errors && response.Errors.length > 0) {
      for (const err of response.Errors) {
        if (err.Key) failedKeys.push(err.Key);
      }
      log.warn(
        { failedCount: response.Errors.length, errors: response.Errors },
        "Some R2 files failed to delete",
      );
    }
  }

  log.info({ count: keys.length, failed: failedKeys.length }, "Deleted R2 files");
  return failedKeys;
}
