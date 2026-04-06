// -----------------------------------------------------------------------
// Video constraints
// -----------------------------------------------------------------------

/** Maximum allowed video duration in seconds (1 hour). */
export const MAX_VIDEO_DURATION = 3_600;

/** Expiry duration for R2 signed playback URLs in seconds (15 minutes). */
export const SIGNED_URL_EXPIRY = 900;

/** Maximum upload file size in bytes (2 GB). */
export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

/** Accepted video MIME types for upload. */
export const ACCEPTED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

// -----------------------------------------------------------------------
// Pagination defaults
// -----------------------------------------------------------------------

/** Default number of items per page for paginated lists. */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum number of items per page allowed by the API. */
export const MAX_PAGE_SIZE = 100;

// -----------------------------------------------------------------------
// Auth / security
// -----------------------------------------------------------------------

/** bcrypt salt rounds for password hashing. */
export const BCRYPT_SALT_ROUNDS = 12;

/** Session JWT max age in seconds (30 days). */
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

// -----------------------------------------------------------------------
// Application metadata
// -----------------------------------------------------------------------

export const APP_NAME = "E Learning";
export const APP_DESCRIPTION =
  "เข้าถึงคอร์สวิดีโอคุณภาพจากผู้เชี่ยวชาญ สร้างทักษะจริงตามจังหวะของคุณ";
