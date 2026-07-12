import { S3Client } from "@aws-sdk/client-s3";

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId) throw new Error("R2_ACCOUNT_ID is not configured");
  if (!accessKeyId) throw new Error("R2_ACCESS_KEY_ID is not configured");
  if (!secretAccessKey) throw new Error("R2_SECRET_ACCESS_KEY is not configured");

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return _client;
}
