import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SIGNED_URL_EXPIRY } from "@/lib/constants";

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "elearning-videos";

let _r2Client: S3Client | null = null;

/**
 * Returns a lazily-initialized S3Client pointed at Cloudflare R2.
 * Throws at call time (not at module load time) if env vars are missing,
 * so that Next.js can complete its build without a live R2 connection.
 */
export function getR2Client(): S3Client {
  if (_r2Client) return _r2Client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId) throw new Error("Missing env: R2_ACCOUNT_ID");
  if (!accessKeyId) throw new Error("Missing env: R2_ACCESS_KEY_ID");
  if (!secretAccessKey) throw new Error("Missing env: R2_SECRET_ACCESS_KEY");

  _r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return _r2Client;
}

/**
 * Convenience re-export — use `getR2Client()` in server actions / route handlers.
 * @deprecated Use `getR2Client()` directly to benefit from lazy initialization.
 */
export const r2Client = new Proxy({} as S3Client, {
  get(_target, prop) {
    return Reflect.get(getR2Client(), prop);
  },
});

// -----------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------

/**
 * Generates a presigned PUT URL that allows direct upload to R2.
 * Used by admin upload flow. The URL expires after SIGNED_URL_EXPIRY seconds.
 *
 * @param key      - The R2 object key (e.g. "videos/abc123/filename.mp4")
 * @param contentType - MIME type of the file being uploaded (e.g. "video/mp4")
 * @returns        A presigned URL string the client can PUT the file body to
 */
export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: SIGNED_URL_EXPIRY });
}

/**
 * Generates a presigned GET URL that allows a student to stream a video.
 * Expires after SIGNED_URL_EXPIRY seconds (15 minutes) as defined in constants.
 *
 * @param key - The R2 object key of the video
 * @returns   A presigned URL string the video player can load
 */
export async function getPlaybackUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: SIGNED_URL_EXPIRY });
}

/**
 * Permanently deletes an object from R2.
 * Used when an admin hard-deletes a video record (beyond soft-delete).
 *
 * @param key - The R2 object key to delete
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await getR2Client().send(command);
}
