import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SIGNED_URL_EXPIRY } from "@/lib/constants";

/**
 * Bucket name — Tigris sets BUCKET_NAME, R2 uses R2_BUCKET_NAME.
 */
export const R2_BUCKET_NAME =
  process.env.BUCKET_NAME ?? process.env.R2_BUCKET_NAME ?? "elearning-videos";

let _r2Client: S3Client | null = null;

/**
 * Returns a lazily-initialized S3Client.
 *
 * Supports two providers (auto-detected from environment):
 *   1. **Tigris** (Fly.io) — uses AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *   2. **Cloudflare R2**   — uses R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *
 * Throws at call time (not at module load time) if env vars are missing,
 * so that Next.js can complete its build without a live connection.
 */
export function getR2Client(): S3Client {
  if (_r2Client) return _r2Client;

  // Tigris (set automatically by `flyctl storage create`)
  const tigrisEndpoint = process.env.AWS_ENDPOINT_URL_S3;
  if (tigrisEndpoint) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId) throw new Error("Missing env: AWS_ACCESS_KEY_ID");
    if (!secretAccessKey) throw new Error("Missing env: AWS_SECRET_ACCESS_KEY");

    _r2Client = new S3Client({
      region: process.env.AWS_REGION ?? "auto",
      endpoint: tigrisEndpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
    return _r2Client;
  }

  // Cloudflare R2 fallback
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId) throw new Error("Missing env: R2_ACCOUNT_ID or AWS_ENDPOINT_URL_S3");
  if (!accessKeyId) throw new Error("Missing env: R2_ACCESS_KEY_ID");
  if (!secretAccessKey) throw new Error("Missing env: R2_SECRET_ACCESS_KEY");

  const endpoint = process.env.R2_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`;

  _r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
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
// Public-facing S3 client — Docker dev fix
// -----------------------------------------------------------------------

/**
 * In Docker Compose the main S3 client uses `http://minio:9000` (internal
 * hostname). Presigned URLs signed with that endpoint include `host: minio`
 * in the signature, but browsers on the host machine can't resolve `minio`.
 *
 * R2_PUBLIC_ENDPOINT (e.g. `http://localhost:9000`) creates a second client
 * for generating browser-facing presigned URLs. The signature is computed
 * with `host: localhost:9000` so it validates when the browser sends the
 * request.
 *
 * In production (Cloudflare R2), R2_PUBLIC_ENDPOINT is not set, so
 * `getPublicR2Client()` returns the same client as `getR2Client()`.
 */
let _publicR2Client: S3Client | null = null;

function getPublicR2Client(): S3Client {
  const publicEndpoint = process.env.R2_PUBLIC_ENDPOINT;
  if (!publicEndpoint) return getR2Client();

  if (_publicR2Client) return _publicR2Client;

  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return getR2Client();

  _publicR2Client = new S3Client({
    region: "auto",
    endpoint: publicEndpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  return _publicR2Client;
}

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

  return getSignedUrl(getPublicR2Client(), command, { expiresIn: SIGNED_URL_EXPIRY });
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

  return getSignedUrl(getPublicR2Client(), command, { expiresIn: SIGNED_URL_EXPIRY });
}

/**
 * Generates a presigned GET URL for inline viewing of a course material.
 * Sets Content-Disposition to "inline" so the browser renders the file
 * (PDF in native viewer, images displayed directly).
 *
 * @param key - The R2 object key of the material
 * @returns   A presigned URL string
 */
export async function getMaterialViewUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: "inline",
  });

  return getSignedUrl(getPublicR2Client(), command, { expiresIn: SIGNED_URL_EXPIRY });
}

/**
 * Generates a presigned GET URL for downloading a course material.
 * Sets Content-Disposition to "attachment" with a custom filename that
 * includes the student's name (e.g. "Alice_Johnson_Notes.docx").
 *
 * @param key              - The R2 object key of the material
 * @param downloadFilename - The filename to suggest for download
 * @returns                A presigned URL string
 */
export async function getMaterialDownloadUrl(
  key: string,
  downloadFilename: string
): Promise<string> {
  // RFC 5987 encoding for Unicode filenames
  const encoded = encodeURIComponent(downloadFilename).replace(/%20/g, "+");
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${downloadFilename}"; filename*=UTF-8''${encoded}`,
  });

  return getSignedUrl(getPublicR2Client(), command, { expiresIn: SIGNED_URL_EXPIRY });
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
